import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { AppNotification } from '../database/entities/notification.entity';
import { PackageRequest } from '../database/entities/package-request.entity';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { TimeSlot } from '../database/entities/time-slot.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { WaitingListEntry } from '../database/entities/waiting-list.entity';
import {
  NotificationType,
  PackageStatus,
  ReservationStatus,
  SessionType,
  UserRole,
  WaitingListStatus,
} from '../database/enums';
import { MailService } from '../mail/mail.service';
import { formatDateRange } from '../mail/mail-templates';
import type { CreatePackageRequestDto } from './dto/create-package-request.dto';
import type { CreateReservationDto } from './dto/create-reservation.dto';
import type { JoinWaitingListDto } from './dto/join-waiting-list.dto';

const WAITLIST_NOTIFICATION_HOLD_MS = 24 * 60 * 60 * 1000;

/** API shape returned for member reservations (list/detail/cancel/create). */
export type MemberReservationView = {
  id: string;
  tenantId: string;
  status: ReservationStatus;
  sessionType: SessionType;
  startTime: Date;
  endTime: Date;
  notes: string | null;
  version: number;
  cancelledAt: Date | null;
  trainer: {
    id: string;
    user: { firstName: string; lastName: string };
  };
  timeSlot: {
    id: string;
    startTime: Date;
    endTime: Date;
  };
  package: {
    id: string;
    remainingSessions: number;
    status: PackageStatus;
    packageTypeName: string;
  };
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TimeSlot) private readonly slotsRepo: Repository<TimeSlot>,
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
    @InjectRepository(Package) private readonly packagesRepo: Repository<Package>,
    @InjectRepository(PackageRequest)
    private readonly packageRequestsRepo: Repository<PackageRequest>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(AppNotification)
    private readonly notificationsRepo: Repository<AppNotification>,
  ) {}

  async listTrainers(tenantId: string, sessionType?: string) {
    const rows = await this.trainersRepo.find({
      where: { tenantId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    });
    const filtered =
      sessionType && (sessionType === 'personal_training' || sessionType === 'massage')
        ? rows.filter(
            (t) =>
              Array.isArray(t.offersSessionTypes) && t.offersSessionTypes.includes(sessionType),
          )
        : rows;
    return filtered.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      bio: t.bio,
      certifications: t.certifications,
      specializations: t.specializations,
      photoUrl: t.photoUrl,
      avgRating: t.avgRating,
      totalSessions: t.totalSessions,
      offersSessionTypes: t.offersSessionTypes,
      memberSince: t.createdAt.toISOString(),
      user: {
        id: t.user.id,
        firstName: t.user.firstName,
        lastName: t.user.lastName,
      },
    }));
  }

  async createPackageRequest(user: User, dto: CreatePackageRequestDto) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can request packages');
    }
    const sessionTypeEnum =
      dto.sessionType === 'personal_training' ? SessionType.PERSONAL_TRAINING : SessionType.MASSAGE;
    const sessionKey = dto.sessionType === 'personal_training' ? 'personal_training' : 'massage';

    let preferredTrainerId: string | null = null;
    let preferredTrainerSummary: string | null = null;
    if (dto.preferredTrainerId) {
      const tr = await this.trainersRepo.findOne({
        where: { id: dto.preferredTrainerId, tenantId: user.tenantId },
        relations: { user: true },
      });
      if (!tr) {
        throw new BadRequestException('Trainer not found');
      }
      if (!Array.isArray(tr.offersSessionTypes) || !tr.offersSessionTypes.includes(sessionKey)) {
        throw new BadRequestException('Trainer does not offer this session type');
      }
      preferredTrainerId = tr.id;
      preferredTrainerSummary =
        `${tr.user.firstName ?? ''} ${tr.user.lastName ?? ''}`.trim() || null;
    }

    const row = this.packageRequestsRepo.create({
      userId: user.id,
      tenantId: user.tenantId,
      sessionType: sessionTypeEnum,
      message: dto.message?.trim() ? dto.message.trim() : null,
      preferredTrainerId,
      status: 'pending',
    });
    await this.packageRequestsRepo.save(row);

    const tenant = await this.tenantsRepo.findOne({
      where: { id: user.tenantId },
      select: ['id', 'name'],
    });
    const clubName = tenant?.name ?? 'Kulüp';
    const msgPreview = row.message?.slice(0, 500) ?? null;

    const memberName = `${user.firstName} ${user.lastName}`.trim();
    const notifBody =
      sessionTypeEnum === SessionType.MASSAGE
        ? 'Masaj paketi talebiniz kulübe iletildi.'
        : 'Özel ders paketi talebiniz kulübe iletildi.';
    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        userId: user.id,
        type: NotificationType.PACKAGE,
        title: 'Paket talebi alındı',
        body: notifBody,
        data: { packageRequestId: row.id },
        isRead: false,
        readAt: null,
      }),
    );

    const alertOverride = this.config.get<string>('MAIL_SALON_ALERT_EMAILS')?.trim();
    if (!alertOverride) {
      const admins = await this.usersRepo.find({
        where: { tenantId: user.tenantId, role: UserRole.ADMINISTRATOR },
        select: ['id'],
      });
      for (const a of admins) {
        await this.notificationsRepo.save(
          this.notificationsRepo.create({
            userId: a.id,
            type: NotificationType.PACKAGE,
            title: 'Yeni paket talebi',
            body: `${memberName}: ${notifBody}`,
            data: { packageRequestId: row.id },
            isRead: false,
            readAt: null,
          }),
        );
      }
    }

    void this.mail
      .sendPackageRequestMemberAck({
        to: user.email,
        memberFirstName: user.firstName,
        clubName,
        sessionType: sessionTypeEnum,
        messagePreview: msgPreview,
        preferredTrainerSummary,
      })
      .catch((cause: unknown) => {
        const msg = cause instanceof Error ? cause.message : String(cause);
        this.logger.error(`Package request member email failed: ${msg}`);
      });

    const staffEmails = await this.resolveSalonAlertEmails(user.tenantId);
    if (staffEmails.length === 0) {
      this.logger.warn(
        `No salon alert recipients for tenant ${user.tenantId}; package request ${row.id} emails skipped.`,
      );
    } else {
      void this.mail
        .sendPackageRequestStaffAlert({
          to: staffEmails,
          clubName,
          memberName,
          memberEmail: user.email,
          sessionType: sessionTypeEnum,
          messagePreview: msgPreview,
          requestId: row.id,
          preferredTrainerSummary,
        })
        .catch((cause: unknown) => {
          const msg = cause instanceof Error ? cause.message : String(cause);
          this.logger.error(`Package request staff email failed: ${msg}`);
        });
    }

    return { id: row.id, createdAt: row.createdAt };
  }

  async listAvailability(tenantId: string, trainerId: string, fromIso: string, toIso: string) {
    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId, tenantId },
    });
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('Invalid from/to range');
    }

    const slots = await this.slotsRepo
      .createQueryBuilder('s')
      .where('s.trainerId = :trainerId', { trainerId })
      .andWhere('s.startTime >= :from', { from })
      .andWhere('s.startTime < :to', { to })
      .orderBy('s.startTime', 'ASC')
      .getMany();

    return slots.map((s) => ({
      id: s.id,
      trainerId: s.trainerId,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      bookedCount: s.bookedCount,
      remainingCapacity: Math.max(0, s.capacity - s.bookedCount),
    }));
  }

  async listMyReservations(user: User, limit = 50, sessionType?: SessionType) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can list personal reservations');
    }
    const where: FindOptionsWhere<Reservation> = {
      userId: user.id,
      tenantId: user.tenantId,
    };
    if (sessionType) {
      where.sessionType = sessionType;
    }
    const rows = await this.reservationsRepo.find({
      where,
      order: { startTime: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
      relations: { trainer: { user: true }, timeSlot: true, package: { packageType: true } },
    });
    return rows.map((r) => this.toReservationResponse(r));
  }

  async listMyPackages(user: User) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can list their packages');
    }
    const rows = await this.packagesRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.packageType', 'pt')
      .where('p.userId = :userId', { userId: user.id })
      .andWhere('pt.tenantId = :tenantId', { tenantId: user.tenantId })
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    return rows.map((p) => ({
      id: p.id,
      remainingSessions: p.remainingSessions,
      expiresAt: p.expiresAt,
      status: p.status,
      assignedTrainerId: p.assignedTrainerId ?? null,
      packageType: {
        id: p.packageType.id,
        name: p.packageType.name,
        sessionType: p.packageType.sessionType,
      },
    }));
  }

  async createReservation(user: User, dto: CreateReservationDto) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can create reservations');
    }

    const result: MemberReservationView = await this.dataSource.transaction(async (em) => {
      const slot = await em
        .createQueryBuilder(TimeSlot, 's')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('s.trainer', 'tr')
        .where('s.id = :id', { id: dto.timeSlotId })
        .getOne();
      if (!slot) {
        throw new NotFoundException('Time slot not found');
      }
      if (slot.trainer.tenantId !== user.tenantId) {
        throw new ForbiddenException('Time slot does not belong to your tenant');
      }
      if (slot.startTime <= new Date()) {
        throw new BadRequestException('Cannot book a slot that has already started');
      }
      if (slot.bookedCount >= slot.capacity) {
        throw new ConflictException('This time slot is full');
      }

      const pkg = await em
        .createQueryBuilder(Package, 'p')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('p.packageType', 'pt')
        .where('p.id = :id', { id: dto.packageId })
        .getOne();
      if (!pkg) {
        throw new NotFoundException('Package not found');
      }
      if (pkg.userId !== user.id) {
        throw new ForbiddenException('Package does not belong to you');
      }
      if (pkg.packageType.tenantId !== user.tenantId) {
        throw new ForbiddenException('Package does not belong to your tenant');
      }
      if (pkg.assignedTrainerId && pkg.assignedTrainerId !== slot.trainerId) {
        throw new BadRequestException('This package is locked to another trainer');
      }
      if (pkg.status !== PackageStatus.ACTIVE) {
        throw new BadRequestException('Package is not active');
      }
      if (pkg.remainingSessions < 1) {
        throw new BadRequestException('No sessions left on this package');
      }
      const today = new Date().toISOString().slice(0, 10);
      if (pkg.expiresAt < today) {
        throw new BadRequestException('Package has expired');
      }

      const overlap = await em
        .createQueryBuilder(Reservation, 'r')
        .where('r.userId = :userId', { userId: user.id })
        .andWhere('r.tenantId = :tenantId', { tenantId: user.tenantId })
        .andWhere('r.status IN (:...st)', {
          st: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
        })
        .andWhere('r.startTime < :end', { end: slot.endTime })
        .andWhere('r.endTime > :start', { start: slot.startTime })
        .getCount();
      if (overlap > 0) {
        throw new ConflictException('You already have a reservation in this time range');
      }

      slot.bookedCount += 1;
      await em.save(TimeSlot, slot);

      pkg.remainingSessions -= 1;
      if (pkg.remainingSessions === 0) {
        pkg.status = PackageStatus.DEPLETED;
      }
      await em.save(Package, pkg);

      const sessionType = pkg.packageType.sessionType;
      const reservation = em.create(Reservation, {
        userId: user.id,
        trainerId: slot.trainerId,
        packageId: pkg.id,
        timeSlotId: slot.id,
        tenantId: user.tenantId,
        sessionType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: ReservationStatus.CONFIRMED,
        notes: null,
        cancelledAt: null,
      });
      await em.save(Reservation, reservation);

      const full = await em.findOne(Reservation, {
        where: { id: reservation.id },
        relations: { trainer: { user: true }, timeSlot: true, package: { packageType: true } },
      });
      return this.toReservationResponse(full!);
    });

    void this.afterReservationCreated(user, result).catch((cause: unknown) => {
      const msg = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`afterReservationCreated failed: ${msg}`);
    });
    return result;
  }

  async cancelReservation(user: User, reservationId: string) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can cancel their reservations');
    }

    const result: MemberReservationView = await this.dataSource.transaction(async (em) => {
      const reservation = await em
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('r.timeSlot', 'slot')
        .where('r.id = :id', { id: reservationId })
        .andWhere('r.userId = :userId', { userId: user.id })
        .andWhere('r.tenantId = :tenantId', { tenantId: user.tenantId })
        .getOne();

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }
      if (
        reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.CONFIRMED
      ) {
        throw new BadRequestException('Reservation cannot be cancelled');
      }
      if (reservation.startTime <= new Date()) {
        throw new BadRequestException('Cannot cancel a session that has already started');
      }

      reservation.status = ReservationStatus.CANCELLED;
      reservation.cancelledAt = new Date();
      await em.save(Reservation, reservation);

      const slot = await em
        .createQueryBuilder(TimeSlot, 's')
        .setLock('pessimistic_write')
        .where('s.id = :id', { id: reservation.timeSlotId })
        .getOne();
      if (slot && slot.bookedCount > 0) {
        slot.bookedCount -= 1;
        await em.save(TimeSlot, slot);

        let freeSeats = slot.capacity - slot.bookedCount;
        while (freeSeats > 0) {
          const next = await em
            .createQueryBuilder(WaitingListEntry, 'w')
            .setLock('pessimistic_write')
            .where('w.timeSlotId = :slotId', { slotId: slot.id })
            .andWhere('w.status = :st', { st: WaitingListStatus.ACTIVE })
            .orderBy('w.position', 'ASC')
            .getOne();
          if (!next) {
            break;
          }
          const now = new Date();
          next.status = WaitingListStatus.NOTIFIED;
          next.notifiedAt = now;
          next.expiresAt = new Date(now.getTime() + WAITLIST_NOTIFICATION_HOLD_MS);
          await em.save(WaitingListEntry, next);
          freeSeats -= 1;
        }
      }

      const pkg = await em
        .createQueryBuilder(Package, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: reservation.packageId })
        .getOne();
      if (pkg) {
        pkg.remainingSessions += 1;
        if (pkg.status === PackageStatus.DEPLETED && pkg.remainingSessions > 0) {
          pkg.status = PackageStatus.ACTIVE;
        }
        await em.save(Package, pkg);
      }

      const full = await em.findOne(Reservation, {
        where: { id: reservation.id },
        relations: { trainer: { user: true }, timeSlot: true, package: { packageType: true } },
      });
      return this.toReservationResponse(full!);
    });

    void this.afterReservationCancelled(user, result).catch((cause: unknown) => {
      const msg = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`afterReservationCancelled failed: ${msg}`);
    });
    return result;
  }

  async joinWaitingList(user: User, dto: JoinWaitingListDto) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can join the waiting list');
    }

    try {
      return await this.dataSource.transaction(async (em) => {
        const slot = await em
          .createQueryBuilder(TimeSlot, 's')
          .setLock('pessimistic_write')
          .innerJoinAndSelect('s.trainer', 'tr')
          .where('s.id = :id', { id: dto.timeSlotId })
          .getOne();
        if (!slot) {
          throw new NotFoundException('Time slot not found');
        }
        if (slot.trainer.tenantId !== user.tenantId) {
          throw new ForbiddenException('Time slot does not belong to your tenant');
        }
        if (slot.startTime <= new Date()) {
          throw new BadRequestException(
            'Cannot join waiting list for a slot that has already started',
          );
        }
        if (slot.bookedCount < slot.capacity) {
          throw new BadRequestException('This slot still has capacity; book it instead');
        }

        const existingRes = await em
          .createQueryBuilder(Reservation, 'r')
          .where('r.userId = :userId', { userId: user.id })
          .andWhere('r.timeSlotId = :slotId', { slotId: slot.id })
          .andWhere('r.status IN (:...st)', {
            st: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          })
          .getCount();
        if (existingRes > 0) {
          throw new ConflictException('You already have a reservation for this time slot');
        }

        const existingWl = await em
          .createQueryBuilder(WaitingListEntry, 'w')
          .where('w.timeSlotId = :slotId', { slotId: slot.id })
          .andWhere('w.userId = :userId', { userId: user.id })
          .andWhere('w.status = :st', { st: WaitingListStatus.ACTIVE })
          .getCount();
        if (existingWl > 0) {
          throw new ConflictException('You are already on the waiting list for this time slot');
        }

        const overlap = await em
          .createQueryBuilder(Reservation, 'r')
          .where('r.userId = :userId', { userId: user.id })
          .andWhere('r.tenantId = :tenantId', { tenantId: user.tenantId })
          .andWhere('r.status IN (:...st)', {
            st: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
          })
          .andWhere('r.startTime < :end', { end: slot.endTime })
          .andWhere('r.endTime > :start', { start: slot.startTime })
          .getCount();
        if (overlap > 0) {
          throw new ConflictException('You already have a reservation overlapping this time');
        }

        const raw = await em
          .createQueryBuilder(WaitingListEntry, 'w')
          .select('COALESCE(MAX(w.position), 0)', 'max')
          .where('w.timeSlotId = :slotId', { slotId: slot.id })
          .andWhere('w.status = :st', { st: WaitingListStatus.ACTIVE })
          .getRawOne<{ max: string }>();
        const position = Number.parseInt(raw?.max ?? '0', 10) + 1;

        const entry = em.create(WaitingListEntry, {
          timeSlotId: slot.id,
          userId: user.id,
          position,
          status: WaitingListStatus.ACTIVE,
          notifiedAt: null,
          expiresAt: null,
        });
        await em.save(WaitingListEntry, entry);

        return {
          id: entry.id,
          timeSlotId: entry.timeSlotId,
          position: entry.position,
          status: entry.status,
          createdAt: entry.createdAt,
        };
      });
    } catch (e: unknown) {
      if (e instanceof QueryFailedError) {
        const code = (e as QueryFailedError & { driverError?: { code?: string } }).driverError
          ?.code;
        if (code === '23505') {
          throw new ConflictException('You are already on the waiting list for this time slot');
        }
      }
      throw e;
    }
  }

  private getMailFormatting(): { locale: string; timeZone: string } {
    return {
      locale: this.config.get<string>('MAIL_LOCALE')?.trim() || 'tr-TR',
      timeZone: this.config.get<string>('MAIL_TIMEZONE')?.trim() || 'Europe/Istanbul',
    };
  }

  private async resolveSalonAlertEmails(tenantId: string): Promise<string[]> {
    const raw = this.config.get<string>('MAIL_SALON_ALERT_EMAILS')?.trim();
    if (raw) {
      return raw
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);
    }
    const admins = await this.usersRepo.find({
      where: { tenantId, role: UserRole.ADMINISTRATOR },
      select: ['email'],
    });
    return admins.map((a) => a.email);
  }

  private async afterReservationCreated(
    member: User,
    res: Pick<
      MemberReservationView,
      'id' | 'sessionType' | 'startTime' | 'endTime' | 'trainer' | 'package'
    >,
  ): Promise<void> {
    const tenant = await this.tenantsRepo.findOne({
      where: { id: member.tenantId },
      select: ['name'],
    });
    const clubName = tenant?.name ?? 'Kulüp';
    const trainerName = `${res.trainer.user.firstName} ${res.trainer.user.lastName}`.trim();
    const { locale, timeZone } = this.getMailFormatting();
    const { dateLine, timeLine } = formatDateRange(
      new Date(res.startTime),
      new Date(res.endTime),
      locale,
      timeZone,
    );
    const bodyLine = `${trainerName} — ${dateLine} ${timeLine}`;

    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        userId: member.id,
        type: NotificationType.RESERVATION,
        title: 'Rezervasyon onaylandı',
        body: bodyLine,
        data: { reservationId: res.id },
        isRead: false,
        readAt: null,
      }),
    );

    await this.mail.sendReservationConfirmed({
      to: member.email,
      memberFirstName: member.firstName,
      clubName,
      trainerName,
      sessionType: res.sessionType,
      startTime: new Date(res.startTime),
      endTime: new Date(res.endTime),
      packageTypeName: res.package.packageTypeName,
      remainingSessions: res.package.remainingSessions,
    });
  }

  private async afterReservationCancelled(
    member: User,
    res: {
      id: string;
      sessionType: SessionType;
      startTime: Date;
      endTime: Date;
      trainer: { user: { firstName: string; lastName: string } };
      package: { remainingSessions: number };
    },
  ): Promise<void> {
    const tenant = await this.tenantsRepo.findOne({
      where: { id: member.tenantId },
      select: ['name'],
    });
    const clubName = tenant?.name ?? 'Kulüp';
    const trainerName = `${res.trainer.user.firstName} ${res.trainer.user.lastName}`.trim();
    const { locale, timeZone } = this.getMailFormatting();
    const { dateLine, timeLine } = formatDateRange(
      new Date(res.startTime),
      new Date(res.endTime),
      locale,
      timeZone,
    );
    const bodyLine = `İptal: ${trainerName} — ${dateLine} ${timeLine}`;

    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        userId: member.id,
        type: NotificationType.RESERVATION,
        title: 'Rezervasyon iptal edildi',
        body: bodyLine,
        data: { reservationId: res.id },
        isRead: false,
        readAt: null,
      }),
    );

    await this.mail.sendReservationCancelled({
      to: member.email,
      memberFirstName: member.firstName,
      clubName,
      trainerName,
      sessionType: res.sessionType,
      startTime: new Date(res.startTime),
      endTime: new Date(res.endTime),
      remainingSessions: res.package.remainingSessions,
    });
  }

  private toReservationResponse(r: Reservation): MemberReservationView {
    return {
      id: r.id,
      tenantId: r.tenantId,
      status: r.status,
      sessionType: r.sessionType,
      startTime: r.startTime,
      endTime: r.endTime,
      notes: r.notes,
      version: r.version,
      cancelledAt: r.cancelledAt,
      trainer: {
        id: r.trainer.id,
        user: {
          firstName: r.trainer.user.firstName,
          lastName: r.trainer.user.lastName,
        },
      },
      timeSlot: {
        id: r.timeSlot.id,
        startTime: r.timeSlot.startTime,
        endTime: r.timeSlot.endTime,
      },
      package: {
        id: r.package.id,
        remainingSessions: r.package.remainingSessions,
        status: r.package.status,
        packageTypeName: r.package.packageType.name,
      },
    };
  }
}
