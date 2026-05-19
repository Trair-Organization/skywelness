import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Availability } from '../database/entities/availability.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { SpaBooking } from '../database/entities/spa-booking.entity';
import { SpaPackage } from '../database/entities/spa-package.entity';
import { SpaReview } from '../database/entities/spa-review.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { SpaTherapist } from '../database/entities/spa-therapist.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { PackageStatus, ReservationStatus, SessionType } from '../database/enums';
import { PushService } from '../notifications/push.service';

@Injectable()
export class SpaServiceService {
  constructor(
    @InjectRepository(SpaService) private readonly servicesRepo: Repository<SpaService>,
    @InjectRepository(SpaTherapist) private readonly therapistsRepo: Repository<SpaTherapist>,
    @InjectRepository(SpaPackage) private readonly packagesRepo: Repository<SpaPackage>,
    @InjectRepository(SpaBooking) private readonly bookingsRepo: Repository<SpaBooking>,
    @InjectRepository(SpaReview) private readonly reviewsRepo: Repository<SpaReview>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Availability) private readonly availabilityRepo: Repository<Availability>,
    @InjectRepository(Reservation) private readonly reservationsRepo: Repository<Reservation>,
    @InjectRepository(Package) private readonly memberPackagesRepo: Repository<Package>,
    @InjectRepository(PackageType) private readonly packageTypesRepo: Repository<PackageType>,
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
  async listTherapists(tenantId: string, includeInactive = false) {
    const where: Record<string, unknown> = { tenantId };
    if (!includeInactive) where.active = true;
    return this.therapistsRepo.find({ where, order: { name: 'ASC' } });
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

  /** Public: Keşif ekranı için spa hizmetleri (subdomain ile). */
  async listPublicServicesBySubdomain(subdomain: string) {
    const tenant = await this.tenantsRepo.findOne({
      where: { subdomain: subdomain.trim().toLowerCase() },
    });
    if (!tenant) return [];
    return this.listPublicServices(tenant.id);
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
        'sessionCost',
        'imageUrl',
        'benefits',
      ],
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Public: Subdomain için masöz bazlı boş slotlar (rezervasyon ekranı).
   * Geçmiş saatler ve dolu (rezerve) slotlar filtrelenir.
   */
  async listPublicTherapistAvailabilityBySubdomain(subdomain: string, date: string) {
    const tenant = await this.tenantsRepo.findOne({
      where: { subdomain: subdomain.trim().toLowerCase() },
    });
    if (!tenant) return [];

    const therapists = await this.therapistsRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { name: 'ASC' },
    });
    if (therapists.length === 0) return [];

    const therapistIds = therapists.map((t) => t.id);

    const availabilities = await this.availabilityRepo
      .createQueryBuilder('a')
      .where('a.spaTherapistId IN (:...ids)', { ids: therapistIds })
      .andWhere('a.date = :date', { date })
      .andWhere('a.available = true')
      .orderBy('a.startTime', 'ASC')
      .getMany();

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const reservations = await this.reservationsRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tid', { tid: tenant.id })
      .andWhere('r.spaTherapistId IS NOT NULL')
      .andWhere('r.spaTherapistId IN (:...ids)', { ids: therapistIds })
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from AND r.startTime < :to', { from: dayStart, to: dayEnd })
      .getMany();

    const bookedKeys = new Set(
      reservations.map(
        (r) => `${r.spaTherapistId}|${new Date(r.startTime).toISOString().slice(11, 16)}`,
      ),
    );

    const now = new Date();

    return therapists.map((th) => {
      const slots = availabilities
        .filter((a) => a.spaTherapistId === th.id)
        .filter((a) => {
          const slotTime = new Date(`${date}T${a.startTime}`);
          if (slotTime <= now) return false;
          const key = `${a.spaTherapistId}|${a.startTime.slice(0, 5)}`;
          return !bookedKeys.has(key);
        })
        .map((a) => ({
          availabilityId: a.id,
          startTime: a.startTime.slice(0, 5),
          endTime: a.endTime.slice(0, 5),
        }));

      return {
        therapistId: th.id,
        therapistName: th.name,
        photoUrl: th.photoUrl,
        slots,
      };
    });
  }

  // ─── Member Slot Booking (Availability-based) ──────────────────────────────

  /** Üye: Satın alınabilir masaj paket tipleri (aktif olanlar). */
  async listPackageTypes(tenantId: string) {
    return this.packageTypesRepo.find({
      where: { tenantId, active: true, sessionType: SessionType.MASSAGE },
      order: { sessionCount: 'ASC' },
    });
  }

  /** Üye: Belirli bir tarih için müsait masaj slotları. */
  async getAvailableSlots(date: string) {
    // Get all available slots for spa therapists on the given date
    const slots = await this.availabilityRepo.find({
      where: {
        date,
        available: true,
      },
      relations: ['spaTherapist'],
    });

    // Filter only slots that have a spaTherapistId
    const spaSlots = slots.filter((s) => s.spaTherapistId !== null && s.spaTherapist !== null);

    // For each slot, check if there's already a confirmed/pending reservation
    const availableSlots: Array<{
      availabilityId: string;
      therapistId: string;
      therapistName: string;
      therapistPhoto: string | null;
      startTime: string;
      endTime: string;
    }> = [];

    for (const slot of spaSlots) {
      // Build the full timestamp for the slot's start time on the given date
      const slotStart = new Date(`${date}T${slot.startTime}`);

      const existingReservation = await this.reservationsRepo.findOne({
        where: {
          spaTherapistId: slot.spaTherapistId!,
          startTime: slotStart,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        },
      });

      if (!existingReservation) {
        availableSlots.push({
          availabilityId: slot.id,
          therapistId: slot.spaTherapistId!,
          therapistName: slot.spaTherapist!.name,
          therapistPhoto: slot.spaTherapist!.photoUrl ?? null,
          startTime: slot.startTime.slice(0, 5),
          endTime: slot.endTime.slice(0, 5),
        });
      }
    }

    return {
      date,
      slots: availableSlots,
    };
  }

  /** Üye: Masaj paketi bakiyesi. */
  async getMyPackageBalance(userId: string) {
    const packages = await this.memberPackagesRepo.find({
      where: {
        userId,
        status: PackageStatus.ACTIVE,
      },
      relations: ['packageType'],
    });

    const massagePackages = packages.filter(
      (p) => p.packageType && p.packageType.sessionType === SessionType.MASSAGE,
    );

    const remainingSessions = massagePackages.reduce((sum, p) => sum + p.remainingSessions, 0);

    return {
      remainingSessions,
      packages: massagePackages.map((p) => ({
        id: p.id,
        packageTypeName: p.packageType.name,
        remainingSessions: p.remainingSessions,
        expiresAt: p.expiresAt,
        status: p.status,
      })),
    };
  }

  /** Üye: Müsait slot'u rezerve et. */
  async bookSlot(userId: string, tenantId: string, availabilityId: string, serviceId: string) {
    // 1. Validate availability exists and is for today or future
    const availability = await this.availabilityRepo.findOne({
      where: { id: availabilityId, available: true },
      relations: ['spaTherapist'],
    });
    if (!availability) {
      throw new NotFoundException('Availability slot not found or not available');
    }
    if (!availability.spaTherapistId) {
      throw new BadRequestException('This slot is not for a spa therapist');
    }

    const today = new Date().toISOString().slice(0, 10);
    if (availability.date < today) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    // 2. Validate no existing confirmed/pending reservation for that therapist+time
    const slotStart = new Date(`${availability.date}T${availability.startTime}`);
    const slotEnd = new Date(`${availability.date}T${availability.endTime}`);

    const existingReservation = await this.reservationsRepo.findOne({
      where: {
        spaTherapistId: availability.spaTherapistId,
        startTime: slotStart,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
      },
    });
    if (existingReservation) {
      throw new BadRequestException('This slot is already booked');
    }

    // 3. Get service sessionCost
    const service = await this.servicesRepo.findOne({ where: { id: serviceId } });
    const sessionCost = service?.sessionCost || 1;

    // 4. Check member has active massage package with enough sessions
    const packages = await this.memberPackagesRepo.find({
      where: {
        userId,
        status: PackageStatus.ACTIVE,
      },
      relations: ['packageType'],
    });

    const massagePackage = packages.find(
      (p) =>
        p.packageType &&
        p.packageType.sessionType === SessionType.MASSAGE &&
        p.remainingSessions >= sessionCost &&
        p.expiresAt >= today,
    );
    if (!massagePackage) {
      throw new BadRequestException(
        `Yeterli seans yok (bu hizmet ${sessionCost} kredi gerektirir)`,
      );
    }

    // 5. Deduct sessionCost from package
    const sessionsBefore = massagePackage.remainingSessions;
    massagePackage.remainingSessions -= sessionCost;
    if (massagePackage.remainingSessions <= 0) {
      massagePackage.remainingSessions = 0;
      massagePackage.status = PackageStatus.DEPLETED;
    }
    await this.memberPackagesRepo.save(massagePackage);

    // 6. Create a Reservation record
    const reservation = this.reservationsRepo.create({
      userId,
      tenantId,
      spaTherapistId: availability.spaTherapistId,
      spaServiceId: serviceId,
      packageId: massagePackage.id,
      sessionType: SessionType.MASSAGE,
      startTime: slotStart,
      endTime: slotEnd,
      status: ReservationStatus.CONFIRMED,
      notes: null,
      cancelledAt: null,
      sessionsBefore,
      sessionsAfter: massagePackage.remainingSessions,
    });
    const saved = await this.reservationsRepo.save(reservation);

    // Bildirim gönder (async, hata olursa sessizce devam et)
    void (async () => {
      try {
        const user = (await this.memberPackagesRepo.manager
          .getRepository('User')
          .findOne({ where: { id: userId } })) as {
          firstName: string;
          lastName: string;
          phone: string | null;
          email: string;
        } | null;
        if (user) {
          const therapistName = availability.spaTherapist?.name ?? '';
          const date = new Date(slotStart).toLocaleDateString('tr-TR');
          const time = availability.startTime.slice(0, 5);
          // Push
          await this.pushService.sendToUser(
            userId,
            '📅 Randevunuz Oluşturuldu',
            `${date} ${time} — ${therapistName}`,
          );
        }
      } catch {
        /* silent */
      }
    })();

    return saved;
  }

  /** Üye: Spa rezervasyonunu iptal et (3 saat kuralı). */
  async cancelSpaReservation(userId: string, reservationId: string) {
    const reservation = await this.reservationsRepo.findOne({
      where: { id: reservationId, userId },
    });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }
    if (
      reservation.status !== ReservationStatus.CONFIRMED &&
      reservation.status !== ReservationStatus.PENDING
    ) {
      throw new BadRequestException('Reservation cannot be cancelled');
    }

    const now = new Date();
    const startTime = new Date(reservation.startTime);
    const diffMs = startTime.getTime() - now.getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000;

    let refunded = false;

    // Cancel the reservation
    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = now;
    await this.reservationsRepo.save(reservation);

    // If more than 3 hours before start → refund sessionCost
    if (diffMs > threeHoursMs && reservation.packageId) {
      // Get service sessionCost
      let refundAmount = 1;
      if (reservation.spaServiceId) {
        const svc = await this.servicesRepo.findOne({ where: { id: reservation.spaServiceId } });
        if (svc) refundAmount = svc.sessionCost || 1;
      }
      const pkg = await this.memberPackagesRepo.findOne({
        where: { id: reservation.packageId },
      });
      if (pkg) {
        pkg.remainingSessions += refundAmount;
        if (pkg.status === PackageStatus.DEPLETED && pkg.remainingSessions > 0) {
          pkg.status = PackageStatus.ACTIVE;
        }
        await this.memberPackagesRepo.save(pkg);
        refunded = true;
      }
    }

    const message = refunded
      ? 'Rezervasyon iptal edildi. Seans kredisi iade edildi.'
      : 'Rezervasyon iptal edildi. İade yok (3 saatten az kaldı).';

    return { refunded, message };
  }
}
