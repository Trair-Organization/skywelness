import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole, ReservationStatus, SessionType } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { Availability } from '../database/entities/availability.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { SpaTherapist } from '../database/entities/spa-therapist.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';

/** 3 saat (ms) — iptal kuralı eşiği */
const CANCEL_THRESHOLD_MS = 3 * 60 * 60 * 1000;

@Controller('member-schedule')
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
@Roles(UserRole.MEMBER)
export class MemberScheduleController {
  constructor(
    @InjectRepository(Availability) private readonly availRepo: Repository<Availability>,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
    @InjectRepository(SpaService) private readonly spaServicesRepo: Repository<SpaService>,
    @InjectRepository(SpaTherapist) private readonly therapistsRepo: Repository<SpaTherapist>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    private readonly notifier: NotificationDispatcher,
  ) {}

  // ─── SPA: Bugünün müsait masaj slotları ──────────────────────────────────────

  /**
   * Belirtilen tarih için tüm masözlerin müsait (booked olmayan) slotlarını döner.
   * Geçmiş saatler filtrelenir.
   */
  @Get('spa/available')
  async listSpaAvailable(@CurrentUser() user: User, @Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const now = new Date();

    // Tüm aktif masözlerin bu tarihteki müsaitlikleri
    const availabilities = await this.availRepo
      .createQueryBuilder('a')
      .innerJoin('a.spaTherapist', 'th')
      .addSelect(['th.id', 'th.name', 'th.photoUrl', 'th.specialties'])
      .where('th.tenantId = :tenantId', { tenantId: user.tenantId })
      .andWhere('th.active = true')
      .andWhere('a.date = :date', { date: targetDate })
      .andWhere('a.available = true')
      .orderBy('a.startTime', 'ASC')
      .getMany();

    // Bu tarihteki mevcut rezervasyonlar (dolu slotları çıkarmak için)
    const dayStart = new Date(`${targetDate}T00:00:00Z`);
    const dayEnd = new Date(`${targetDate}T23:59:59Z`);
    const bookedSlots = await this.resRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId: user.tenantId })
      .andWhere('r.spaTherapistId IS NOT NULL')
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from AND r.startTime < :to', { from: dayStart, to: dayEnd })
      .getMany();

    const bookedKeys = new Set(
      bookedSlots.map(
        (r) => `${r.spaTherapistId}|${new Date(r.startTime).toISOString().slice(11, 16)}`,
      ),
    );

    // Geçmiş saatleri ve dolu slotları filtrele
    const slots = availabilities
      .filter((a) => {
        const slotTime = new Date(`${targetDate}T${a.startTime}Z`);
        if (slotTime <= now) return false; // geçmiş
        const key = `${a.spaTherapistId}|${a.startTime.slice(0, 5)}`;
        return !bookedKeys.has(key); // dolu değil
      })
      .map((a) => ({
        availabilityId: a.id,
        therapistId: a.spaTherapistId,
        therapistName: a.spaTherapist?.name ?? '',
        therapistPhoto: a.spaTherapist?.photoUrl ?? null,
        specialties: a.spaTherapist?.specialties ?? [],
        date: targetDate,
        startTime: a.startTime.slice(0, 5),
        endTime: a.endTime.slice(0, 5),
      }));

    return { date: targetDate, slots };
  }

  /** Spa hizmet listesi (masaj türleri) */
  @Get('spa/services')
  async listSpaServices(@CurrentUser() user: User) {
    const services = await this.spaServicesRepo.find({
      where: { tenantId: user.tenantId, active: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return services.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      durationMinutes: s.durationMinutes,
      price: s.price,
      currency: s.currency,
      description: s.description,
    }));
  }

  /** Üye masaj randevusu oluştur (paket kontrolü dahil) */
  @Post('spa/book')
  async bookSpa(
    @CurrentUser() user: User,
    @Body()
    body: {
      availabilityId: string;
      serviceId: string;
      notes?: string;
    },
  ) {
    // Availability doğrula
    const avail = await this.availRepo.findOne({
      where: { id: body.availabilityId },
      relations: ['spaTherapist'],
    });
    if (!avail || !avail.spaTherapistId) {
      throw new BadRequestException('Geçersiz müsaitlik');
    }
    if (avail.spaTherapist?.tenantId !== undefined) {
      // tenant check via therapist
      const therapist = await this.therapistsRepo.findOne({
        where: { id: avail.spaTherapistId, tenantId: user.tenantId, active: true },
      });
      if (!therapist) throw new BadRequestException('Masöz bulunamadı');
    }

    // Hizmet doğrula
    const service = await this.spaServicesRepo.findOne({
      where: { id: body.serviceId, tenantId: user.tenantId, active: true },
    });
    if (!service) throw new BadRequestException('Hizmet bulunamadı');

    // Zaman hesapla
    const dateStr =
      typeof avail.date === 'string'
        ? avail.date.slice(0, 10)
        : new Date(avail.date).toISOString().slice(0, 10);
    const startTime = new Date(`${dateStr}T${avail.startTime}Z`);
    const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);

    // Geçmiş kontrolü
    if (startTime <= new Date()) {
      throw new BadRequestException('Geçmiş bir saate randevu alınamaz');
    }

    // Çakışma kontrolü
    const conflict = await this.resRepo
      .createQueryBuilder('r')
      .where('r.spaTherapistId = :tid', { tid: avail.spaTherapistId })
      .andWhere('r.status IN (:...s)', { s: ['confirmed', 'pending'] })
      .andWhere('r.startTime < :end AND r.endTime > :start', { start: startTime, end: endTime })
      .getOne();
    if (conflict) throw new BadRequestException('Bu saat dolu');

    // TODO: Paket kontrolü (şimdilik oluştur, paket entegrasyonu sonra)
    // Gerçek üretimde: üyenin aktif masaj paketi var mı? Varsa seans düş.

    const reservation = this.resRepo.create({
      userId: user.id,
      tenantId: user.tenantId,
      spaTherapistId: avail.spaTherapistId,
      spaServiceId: service.id,
      trainerId: null as never,
      packageId: null as never,
      timeSlotId: null as never,
      sessionType: SessionType.MASSAGE,
      startTime,
      endTime,
      status: ReservationStatus.CONFIRMED,
      notes: body.notes?.trim() || null,
    });
    await this.resRepo.save(reservation);

    // Bildirim
    void this.notifier
      .reservationCreatedForMember({
        member: user,
        trainerName: avail.spaTherapist?.name ?? '',
        date: startTime.toLocaleDateString('tr-TR'),
        time: avail.startTime.slice(0, 5),
        sessionType: 'massage',
        reservationId: reservation.id,
      })
      .catch(() => {});

    return {
      ok: true,
      reservationId: reservation.id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      therapistName: avail.spaTherapist?.name,
      serviceName: service.name,
    };
  }

  // ─── PT: Bugünün müsait eğitmen slotları ─────────────────────────────────────

  @Get('pt/available')
  async listPtAvailable(@CurrentUser() user: User, @Query('date') date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const now = new Date();

    const availabilities = await this.availRepo
      .createQueryBuilder('a')
      .innerJoin('a.trainer', 'tr')
      .innerJoin('tr.user', 'u')
      .addSelect(['tr.id', 'tr.photoUrl', 'u.firstName', 'u.lastName'])
      .where('tr.tenantId = :tenantId', { tenantId: user.tenantId })
      .andWhere('a.trainerId IS NOT NULL')
      .andWhere('a.date = :date', { date: targetDate })
      .andWhere('a.available = true')
      .orderBy('a.startTime', 'ASC')
      .getMany();

    const dayStart = new Date(`${targetDate}T00:00:00Z`);
    const dayEnd = new Date(`${targetDate}T23:59:59Z`);
    const bookedSlots = await this.resRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId: user.tenantId })
      .andWhere('r.trainerId IS NOT NULL')
      .andWhere('r.status IN (:...statuses)', { statuses: ['confirmed', 'pending'] })
      .andWhere('r.startTime >= :from AND r.startTime < :to', { from: dayStart, to: dayEnd })
      .getMany();

    const bookedKeys = new Set(
      bookedSlots.map((r) => `${r.trainerId}|${new Date(r.startTime).toISOString().slice(11, 16)}`),
    );

    const slots = availabilities
      .filter((a) => {
        const slotTime = new Date(`${targetDate}T${a.startTime}Z`);
        if (slotTime <= now) return false;
        const key = `${a.trainerId}|${a.startTime.slice(0, 5)}`;
        return !bookedKeys.has(key);
      })
      .map((a) => ({
        availabilityId: a.id,
        trainerId: a.trainerId,
        trainerName: a.trainer?.user
          ? `${a.trainer.user.firstName} ${a.trainer.user.lastName}`.trim()
          : '',
        trainerPhoto: a.trainer?.photoUrl ?? null,
        date: targetDate,
        startTime: a.startTime.slice(0, 5),
        endTime: a.endTime.slice(0, 5),
      }));

    return { date: targetDate, slots };
  }

  /** Üye PT randevusu oluştur */
  @Post('pt/book')
  async bookPt(
    @CurrentUser() user: User,
    @Body() body: { availabilityId: string; notes?: string },
  ) {
    const avail = await this.availRepo.findOne({
      where: { id: body.availabilityId },
      relations: ['trainer', 'trainer.user'],
    });
    if (!avail || !avail.trainerId) throw new BadRequestException('Geçersiz müsaitlik');

    const trainer = await this.trainersRepo.findOne({
      where: { id: avail.trainerId, tenantId: user.tenantId },
      relations: ['user'],
    });
    if (!trainer) throw new BadRequestException('Eğitmen bulunamadı');

    const dateStr =
      typeof avail.date === 'string'
        ? avail.date.slice(0, 10)
        : new Date(avail.date).toISOString().slice(0, 10);
    const startTime = new Date(`${dateStr}T${avail.startTime}Z`);
    const endTime = new Date(`${dateStr}T${avail.endTime}Z`);

    if (startTime <= new Date()) throw new BadRequestException('Geçmiş bir saate randevu alınamaz');

    const conflict = await this.resRepo
      .createQueryBuilder('r')
      .where('r.trainerId = :tid', { tid: avail.trainerId })
      .andWhere('r.status IN (:...s)', { s: ['confirmed', 'pending'] })
      .andWhere('r.startTime < :end AND r.endTime > :start', { start: startTime, end: endTime })
      .getOne();
    if (conflict) throw new BadRequestException('Bu saat dolu');

    const reservation = this.resRepo.create({
      userId: user.id,
      tenantId: user.tenantId,
      trainerId: avail.trainerId,
      spaTherapistId: null,
      spaServiceId: null,
      packageId: null as never,
      timeSlotId: null as never,
      sessionType: SessionType.PERSONAL_TRAINING,
      startTime,
      endTime,
      status: ReservationStatus.CONFIRMED,
      notes: body.notes?.trim() || null,
    });
    await this.resRepo.save(reservation);

    const trainerName = `${trainer.user.firstName} ${trainer.user.lastName}`.trim();
    void this.notifier
      .reservationCreatedForMember({
        member: user,
        trainerName,
        date: startTime.toLocaleDateString('tr-TR'),
        time: avail.startTime.slice(0, 5),
        sessionType: 'personal_training',
        reservationId: reservation.id,
      })
      .catch(() => {});

    return {
      ok: true,
      reservationId: reservation.id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      trainerName,
    };
  }

  // ─── Üye Rezervasyon İptal (3 saat kuralı) ───────────────────────────────────

  /**
   * Üye kendi rezervasyonunu iptal eder.
   * - T-3 saat öncesinde: paket hakkı iade (seans geri verilir)
   * - T-3 saat sonrasında: iptal edilir ama seans yanmış sayılır
   */
  @Delete('reservations/:id')
  async cancelReservation(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) reservationId: string,
  ) {
    const reservation = await this.resRepo.findOne({
      where: { id: reservationId, userId: user.id, tenantId: user.tenantId },
    });
    if (!reservation) throw new BadRequestException('Rezervasyon bulunamadı');
    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.COMPLETED
    ) {
      throw new BadRequestException('Bu rezervasyon zaten iptal/tamamlanmış');
    }

    const now = new Date();
    const msUntilStart = reservation.startTime.getTime() - now.getTime();
    const isEarlyCancel = msUntilStart >= CANCEL_THRESHOLD_MS;

    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = now;
    reservation.notes =
      `${reservation.notes || ''} [CANCEL:${isEarlyCancel ? 'REFUND' : 'NO_REFUND'}]`.trim();
    await this.resRepo.save(reservation);

    // TODO: Paket entegrasyonu — isEarlyCancel ise seans iade et

    const date = reservation.startTime.toLocaleDateString('tr-TR');
    const time = reservation.startTime.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    void this.notifier
      .reservationCancelledForMember({ member: user, trainerName: '', date, time })
      .catch(() => {});

    return {
      ok: true,
      cancelled: true,
      refunded: isEarlyCancel,
      message: isEarlyCancel
        ? 'Rezervasyon iptal edildi. Paket hakkınız iade edildi.'
        : 'Rezervasyon iptal edildi. 3 saatten az kaldığı için paket hakkınız kullanılmış sayılır.',
    };
  }

  // ─── Üyenin yaklaşan randevuları ─────────────────────────────────────────────

  @Get('my-upcoming')
  async myUpcoming(@CurrentUser() user: User) {
    const now = new Date();
    const rows = await this.resRepo.find({
      where: {
        userId: user.id,
        tenantId: user.tenantId,
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['spaTherapist', 'spaService', 'trainer', 'trainer.user'],
      order: { startTime: 'ASC' },
      take: 10,
    });
    return rows
      .filter((r) => new Date(r.startTime) > now)
      .map((r) => {
        const msUntil = new Date(r.startTime).getTime() - now.getTime();
        return {
          id: r.id,
          sessionType: r.sessionType,
          startTime: r.startTime,
          endTime: r.endTime,
          status: r.status,
          therapistName: r.spaTherapist?.name ?? null,
          trainerName: r.trainer?.user
            ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`.trim()
            : null,
          serviceName: r.spaService?.name ?? null,
          canCancelWithRefund: msUntil >= CANCEL_THRESHOLD_MS,
          hoursUntilStart: Math.floor(msUntil / (60 * 60 * 1000)),
        };
      });
  }
}
