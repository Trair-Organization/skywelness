import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpaBooking } from '../database/entities/spa-booking.entity';
import { SpaPackage } from '../database/entities/spa-package.entity';
import { SpaReview } from '../database/entities/spa-review.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { SpaTherapist } from '../database/entities/spa-therapist.entity';
import { PushService } from '../notifications/push.service';

@Injectable()
export class SpaServiceService {
  constructor(
    @InjectRepository(SpaService) private readonly servicesRepo: Repository<SpaService>,
    @InjectRepository(SpaTherapist) private readonly therapistsRepo: Repository<SpaTherapist>,
    @InjectRepository(SpaPackage) private readonly packagesRepo: Repository<SpaPackage>,
    @InjectRepository(SpaBooking) private readonly bookingsRepo: Repository<SpaBooking>,
    @InjectRepository(SpaReview) private readonly reviewsRepo: Repository<SpaReview>,
    private readonly pushService: PushService,
  ) {}

  // ─── Public / Member Endpoints ──────────────────────────────────────────────

  /** Hizmet kataloğu (aktif olanlar). */
  async listServices(tenantId: string, category?: string) {
    const where: Record<string, unknown> = { tenantId, active: true };
    if (category) where.category = category;
    return this.servicesRepo.find({ where, order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  /** Masöz listesi (aktif olanlar). */
  async listTherapists(tenantId: string) {
    return this.therapistsRepo.find({ where: { tenantId, active: true }, order: { name: 'ASC' } });
  }

  /** Paket listesi (aktif olanlar). */
  async listPackages(tenantId: string) {
    return this.packagesRepo.find({
      where: { tenantId, active: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /** Rezervasyon oluştur. */
  async createBooking(input: {
    tenantId: string;
    userId: string;
    serviceId: string;
    therapistId?: string;
    bookingDate: string;
    timeSlot: string;
    notes?: string;
  }) {
    const service = await this.servicesRepo.findOne({
      where: { id: input.serviceId, tenantId: input.tenantId, active: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    if (input.therapistId) {
      const therapist = await this.therapistsRepo.findOne({
        where: { id: input.therapistId, tenantId: input.tenantId, active: true },
      });
      if (!therapist) throw new NotFoundException('Therapist not found');

      // Çakışma kontrolü
      const conflict = await this.bookingsRepo.findOne({
        where: {
          therapistId: input.therapistId,
          bookingDate: input.bookingDate,
          timeSlot: input.timeSlot,
          status: 'confirmed',
        },
      });
      if (conflict) throw new BadRequestException('Bu saat dilimi dolu');
    }

    const booking = this.bookingsRepo.create({
      tenantId: input.tenantId,
      userId: input.userId,
      serviceId: input.serviceId,
      therapistId: input.therapistId ?? null,
      bookingDate: input.bookingDate,
      timeSlot: input.timeSlot,
      notes: input.notes?.trim() || null,
      status: 'pending',
    });
    return this.bookingsRepo.save(booking);
  }

  /** Kullanıcının rezervasyonları. */
  async listUserBookings(userId: string, tenantId: string) {
    return this.bookingsRepo.find({
      where: { userId, tenantId },
      relations: ['service', 'therapist'],
      order: { bookingDate: 'DESC', timeSlot: 'DESC' },
      take: 50,
    });
  }

  /** Rezervasyon iptal. */
  async cancelBooking(bookingId: string, userId: string) {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId, userId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'cancelled') throw new BadRequestException('Already cancelled');
    booking.status = 'cancelled';
    return this.bookingsRepo.save(booking);
  }

  /** Yorum ekle. */
  async addReview(input: { bookingId: string; userId: string; rating: number; comment?: string }) {
    const booking = await this.bookingsRepo.findOne({
      where: { id: input.bookingId, userId: input.userId, status: 'completed' },
    });
    if (!booking) throw new BadRequestException('Only completed bookings can be reviewed');
    const existing = await this.reviewsRepo.findOne({ where: { bookingId: input.bookingId } });
    if (existing) throw new BadRequestException('Already reviewed');

    const review = this.reviewsRepo.create({
      bookingId: input.bookingId,
      userId: input.userId,
      therapistId: booking.therapistId,
      rating: input.rating,
      comment: input.comment?.trim() || null,
    });
    await this.reviewsRepo.save(review);

    // Masöz puanını güncelle
    if (booking.therapistId) {
      const avg = await this.reviewsRepo
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .where('r.therapist_id = :tid', { tid: booking.therapistId })
        .getRawOne<{ avg: string | null }>();
      if (avg?.avg) {
        await this.therapistsRepo.update(
          { id: booking.therapistId },
          { avgRating: Number(avg.avg).toFixed(2) },
        );
      }
    }
    return review;
  }

  // ─── Admin Endpoints ────────────────────────────────────────────────────────

  /** Admin: Tüm rezervasyonlar. */
  async listAllBookings(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.bookingsRepo.find({
      where,
      relations: ['service', 'therapist', 'user'],
      order: { bookingDate: 'ASC', timeSlot: 'ASC' },
      take: 100,
    });
  }

  /** Admin: Rezervasyon durumunu güncelle. */
  async updateBookingStatus(
    bookingId: string,
    tenantId: string,
    status: string,
    adminNote?: string,
  ) {
    const booking = await this.bookingsRepo.findOne({ where: { id: bookingId, tenantId } });
    if (!booking) throw new NotFoundException('Booking not found');
    booking.status = status as SpaBooking['status'];
    if (adminNote !== undefined) booking.adminNote = adminNote?.trim() || null;
    const saved = await this.bookingsRepo.save(booking);

    // Kullanıcıya bildirim
    if (status === 'confirmed') {
      void this.pushService.sendToUser(
        booking.userId,
        '✅ Spa Randevunuz Onaylandı',
        'Randevunuz onaylanmıştır. İyi seanslar!',
      );
    } else if (status === 'cancelled') {
      void this.pushService.sendToUser(
        booking.userId,
        '❌ Spa Randevunuz İptal Edildi',
        'Randevunuz iptal edilmiştir. Detaylar için kulüple iletişime geçin.',
      );
    }
    return saved;
  }

  /** Admin: Hizmet CRUD. */
  async createService(tenantId: string, data: Partial<SpaService>) {
    const service = this.servicesRepo.create({ ...data, tenantId });
    return this.servicesRepo.save(service);
  }

  async updateService(id: string, tenantId: string, data: Partial<SpaService>) {
    const service = await this.servicesRepo.findOne({ where: { id, tenantId } });
    if (!service) throw new NotFoundException('Service not found');
    Object.assign(service, data);
    return this.servicesRepo.save(service);
  }

  async deleteService(id: string, tenantId: string) {
    const service = await this.servicesRepo.findOne({ where: { id, tenantId } });
    if (!service) throw new NotFoundException('Service not found');
    await this.servicesRepo.remove(service);
  }

  /** Admin: Masöz CRUD. */
  async createTherapist(tenantId: string, data: Partial<SpaTherapist>) {
    const therapist = this.therapistsRepo.create({ ...data, tenantId });
    return this.therapistsRepo.save(therapist);
  }

  async updateTherapist(id: string, tenantId: string, data: Partial<SpaTherapist>) {
    const therapist = await this.therapistsRepo.findOne({ where: { id, tenantId } });
    if (!therapist) throw new NotFoundException('Therapist not found');
    Object.assign(therapist, data);
    return this.therapistsRepo.save(therapist);
  }

  async deleteTherapist(id: string, tenantId: string) {
    const therapist = await this.therapistsRepo.findOne({ where: { id, tenantId } });
    if (!therapist) throw new NotFoundException('Therapist not found');
    await this.therapistsRepo.remove(therapist);
  }

  /** Admin: Paket CRUD. */
  async createPackage(tenantId: string, data: Partial<SpaPackage>) {
    const pkg = this.packagesRepo.create({ ...data, tenantId });
    return this.packagesRepo.save(pkg);
  }

  async updatePackage(id: string, tenantId: string, data: Partial<SpaPackage>) {
    const pkg = await this.packagesRepo.findOne({ where: { id, tenantId } });
    if (!pkg) throw new NotFoundException('Package not found');
    Object.assign(pkg, data);
    return this.packagesRepo.save(pkg);
  }

  /** Public: Keşif ekranı için spa hizmetleri. */
  async listPublicServices(tenantId: string) {
    return this.servicesRepo.find({
      where: { tenantId, active: true },
      select: [
        'id',
        'name',
        'description',
        'category',
        'durationMinutes',
        'price',
        'imageUrl',
        'benefits',
      ],
      order: { sortOrder: 'ASC' },
    });
  }
}
