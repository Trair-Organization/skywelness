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
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { TrainerMemberNote } from '../database/entities/trainer-member-note.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { WaitingListEntry } from '../database/entities/waiting-list.entity';
import {
  MemberAccountStatus,
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
  } | null;
  timeSlot: {
    id: string;
    startTime: Date;
    endTime: Date;
  } | null;
  package: {
    id: string;
    remainingSessions: number;
    status: PackageStatus;
    packageTypeName: string;
  } | null;
  spaTherapist: {
    id: string;
    name: string;
  } | null;
  spaService: {
    id: string;
    name: string;
    durationMinutes: number;
  } | null;
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
    @InjectRepository(TrainerMemberLink)
    private readonly trainerMemberLinksRepo: Repository<TrainerMemberLink>,
    @InjectRepository(TrainerMemberNote)
    private readonly trainerMemberNotesRepo: Repository<TrainerMemberNote>,
  ) {}

  private async resolveTrainerForUser(user: User): Promise<Trainer> {
    const trainer = await this.trainersRepo.findOne({
      where: { userId: user.id },
    });
    if (!trainer) {
      throw new NotFoundException('Trainer profile not found');
    }
    return trainer;
  }

  async listTrainers(tenantId: string, sessionType?: string, includeIndependent = false) {
    const qb = this.trainersRepo
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.user', 'u')
      .where('u.accountStatus = :activeStatus', { activeStatus: MemberAccountStatus.ACTIVE })
      .orderBy('t.createdAt', 'ASC');

    if (sessionType) {
      // Booking/service hub keeps tenant-local behavior.
      qb.andWhere('t.tenantId = :tenantId', { tenantId });
    } else if (includeIndependent) {
      // Trainer network can discover both club trainers and independent trainers.
      qb.andWhere('(t.tenantId = :tenantId OR u.role = :independentRole)', {
        tenantId,
        independentRole: UserRole.INDEPENDENT_TRAINER,
      });
    } else {
      qb.andWhere('t.tenantId = :tenantId', { tenantId });
    }

    const rows = await qb.getMany();
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
      isIndependent: t.user.role === UserRole.INDEPENDENT_TRAINER,
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

  async connectMemberToTrainer(user: User, trainerId: string) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can connect to trainers');
    }
    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId },
      relations: { user: true },
    });
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }
    if (trainer.user.accountStatus !== MemberAccountStatus.ACTIVE) {
      throw new BadRequestException('Trainer account is not active');
    }
    const existing = await this.trainerMemberLinksRepo.findOne({
      where: { trainerId, memberUserId: user.id },
    });
    if (existing) {
      if (existing.status === 'archived') {
        existing.tenantId = trainer.tenantId;
        existing.status = 'active';
        await this.trainerMemberLinksRepo.save(existing);
      }
      return { id: existing.id, status: existing.status };
    }
    const link = this.trainerMemberLinksRepo.create({
      tenantId: trainer.tenantId,
      trainerId,
      memberUserId: user.id,
      status: 'active',
    });
    await this.trainerMemberLinksRepo.save(link);
    return { id: link.id, status: link.status };
  }

  async listMyConnectedTrainers(user: User) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can list connected trainers');
    }
    const rows = await this.trainerMemberLinksRepo.find({
      where: { memberUserId: user.id, status: 'active' },
      relations: { trainer: { user: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      linkId: row.id,
      trainerId: row.trainerId,
      createdAt: row.createdAt,
      trainer: {
        firstName: row.trainer.user.firstName,
        lastName: row.trainer.user.lastName,
        photoUrl: row.trainer.photoUrl,
        specialties: row.trainer.specializations,
      },
    }));
  }

  async listTrainerStudents(user: User) {
    if (user.role !== UserRole.TRAINER && user.role !== UserRole.INDEPENDENT_TRAINER) {
      throw new ForbiddenException('Only trainers can list students');
    }
    const trainer = await this.resolveTrainerForUser(user);
    const rows = await this.trainerMemberLinksRepo.find({
      where: { trainerId: trainer.id, status: 'active' },
      relations: { memberUser: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      linkId: row.id,
      memberUserId: row.memberUserId,
      createdAt: row.createdAt,
      member: {
        firstName: row.memberUser.firstName,
        lastName: row.memberUser.lastName,
        email: row.memberUser.email,
        phone: row.memberUser.phone,
      },
    }));
  }

  async addTrainerStudentNote(user: User, memberUserId: string, note: string) {
    if (user.role !== UserRole.TRAINER && user.role !== UserRole.INDEPENDENT_TRAINER) {
      throw new ForbiddenException('Only trainers can add member notes');
    }
    const trainer = await this.resolveTrainerForUser(user);
    const linked = await this.trainerMemberLinksRepo.findOne({
      where: {
        trainerId: trainer.id,
        memberUserId,
        status: 'active',
      },
    });
    if (!linked) {
      throw new ForbiddenException('Member is not linked to this trainer');
    }
    const row = this.trainerMemberNotesRepo.create({
      tenantId: trainer.tenantId,
      trainerId: trainer.id,
      memberUserId,
      createdByUserId: user.id,
      note: note.trim(),
    });
    await this.trainerMemberNotesRepo.save(row);
    return { id: row.id, createdAt: row.createdAt };
  }

  async listTrainerMemberNotes(user: User, memberUserId?: string) {
    if (
      user.role !== UserRole.MEMBER &&
      user.role !== UserRole.TRAINER &&
      user.role !== UserRole.INDEPENDENT_TRAINER
    ) {
      throw new ForbiddenException('Role not allowed');
    }

    if (user.role === UserRole.MEMBER) {
      const notes = await this.trainerMemberNotesRepo.find({
        where: { memberUserId: user.id },
        relations: { trainer: { user: true }, createdByUser: true },
        order: { createdAt: 'DESC' },
      });
      return notes.map((n) => ({
        id: n.id,
        createdAt: n.createdAt,
        note: n.note,
        trainerId: n.trainerId,
        trainerName: `${n.trainer.user.firstName} ${n.trainer.user.lastName}`.trim(),
        createdByUserId: n.createdByUserId,
      }));
    }

    const trainer = await this.resolveTrainerForUser(user);
    if (!memberUserId) {
      throw new BadRequestException('memberUserId is required');
    }
    const linked = await this.trainerMemberLinksRepo.findOne({
      where: {
        trainerId: trainer.id,
        memberUserId,
        status: 'active',
      },
    });
    if (!linked) {
      throw new ForbiddenException('Member is not linked to this trainer');
    }
    const notes = await this.trainerMemberNotesRepo.find({
      where: { trainerId: trainer.id, memberUserId },
      relations: { createdByUser: true, memberUser: true },
      order: { createdAt: 'DESC' },
    });
    return notes.map((n) => ({
      id: n.id,
      createdAt: n.createdAt,
      note: n.note,
      memberUserId: n.memberUserId,
      memberName: `${n.memberUser.firstName} ${n.memberUser.lastName}`.trim(),
      createdByUserId: n.createdByUserId,
    }));
  }

  /** Admin: Paket taleplerini listele. */
  async listPackageRequests(tenantId: string) {
    return this.packageRequestsRepo.find({
      where: { tenantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Admin: Paket talebini onayla ve üyeye paket ata. */
  async approvePackageRequest(
    tenantId: string,
    requestId: string,
    data: {
      packageTypeId: string;
      assignedTrainerId?: string | null;
      note?: string;
      paymentStatus?: string;
      paymentMethod?: string;
    },
  ) {
    const request = await this.packageRequestsRepo.findOne({
      where: { id: requestId, tenantId },
      relations: ['user'],
    });
    if (!request) throw new NotFoundException('Talep bulunamadı');
    if (request.status !== 'pending') {
      throw new BadRequestException('Bu talep zaten işlenmiş');
    }

    // Paket tipini doğrula
    const packageType = (await this.packagesRepo.manager
      .getRepository('PackageType')
      .findOne({ where: { id: data.packageTypeId, tenantId, active: true } })) as {
      id: string;
      name: string;
      sessionCount: number;
      validityDays: number;
      sessionType: string;
    } | null;
    if (!packageType) throw new NotFoundException('Paket tipi bulunamadı');

    // Geçerlilik tarihi hesapla
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + packageType.validityDays);

    // Paket oluştur
    const pkg = this.packagesRepo.create({
      userId: request.userId,
      packageTypeId: packageType.id,
      remainingSessions: packageType.sessionCount,
      expiresAt: expiresAt.toISOString().slice(0, 10),
      assignedTrainerId: data.assignedTrainerId || null,
      status: 'active' as never,
    });
    await this.packagesRepo.save(pkg);

    // Talebi güncelle
    request.status = 'approved';
    request.approvedAt = new Date();
    request.assignedPackageId = pkg.id;
    request.paymentStatus = data.paymentStatus ?? 'paid';
    request.paymentMethod = data.paymentMethod ?? null;
    if (data.note) {
      request.adminNote = data.note;
    }
    await this.packageRequestsRepo.save(request);

    // Üyeye bildirim
    if (request.user) {
      // Push bildirim
      const title = '📦 Paketiniz Tanımlandı';
      const body = `${packageType.name} (${packageType.sessionCount} seans) paketiniz aktif edildi. Artık randevu alabilirsiniz!`;
      await this.notificationsRepo.save(
        this.notificationsRepo.create({
          userId: request.userId,
          type: 'package' as never,
          title,
          body,
          data: { packageId: pkg.id },
          isRead: false,
          readAt: null,
        }),
      );
    }

    return {
      ok: true as const,
      packageId: pkg.id,
      packageTypeName: packageType.name,
      sessionCount: packageType.sessionCount,
    };
  }

  /** Admin: Talep durumunu güncelle (pipeline). */
  async updatePackageRequestStatus(
    tenantId: string,
    requestId: string,
    data: {
      status?: string;
      adminNote?: string;
      paymentStatus?: string;
      paymentMethod?: string;
    },
  ) {
    const request = await this.packageRequestsRepo.findOne({
      where: { id: requestId, tenantId },
    });
    if (!request) throw new NotFoundException('Talep bulunamadı');

    if (data.status) {
      request.status = data.status;
      if (data.status === 'contacted' && !request.contactedAt) {
        request.contactedAt = new Date();
      }
    }
    if (data.adminNote !== undefined) request.adminNote = data.adminNote;
    if (data.paymentStatus) request.paymentStatus = data.paymentStatus;
    if (data.paymentMethod !== undefined) request.paymentMethod = data.paymentMethod;

    await this.packageRequestsRepo.save(request);
    return { ok: true as const };
  }

  /** Admin: Paket talebini reddet. */
  async rejectPackageRequest(tenantId: string, requestId: string, reason?: string) {
    const request = await this.packageRequestsRepo.findOne({
      where: { id: requestId, tenantId },
      relations: ['user'],
    });
    if (!request) throw new NotFoundException('Talep bulunamadı');
    if (request.status !== 'pending') {
      throw new BadRequestException('Bu talep zaten işlenmiş');
    }

    request.status = 'rejected';
    if (reason) {
      request.message = `${request.message ?? ''}\n[Red sebebi: ${reason}]`.trim();
    }
    await this.packageRequestsRepo.save(request);

    // Üyeye bildirim
    if (request.user) {
      await this.notificationsRepo.save(
        this.notificationsRepo.create({
          userId: request.userId,
          type: 'package' as never,
          title: '📦 Paket Talebi Sonucu',
          body: reason
            ? `Talebiniz reddedildi. Sebep: ${reason}`
            : 'Talebiniz reddedildi. Detaylar için kulüple iletişime geçin.',
          data: { requestId },
          isRead: false,
          readAt: null,
        }),
      );
    }

    return { ok: true as const };
  }

  async createPackageRequest(user: User, dto: CreatePackageRequestDto) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can request packages');
    }
    const sessionTypeEnum =
      dto.sessionType === 'personal_training' ? SessionType.PERSONAL_TRAINING : SessionType.MASSAGE;
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
      relations: {
        trainer: { user: true },
        timeSlot: true,
        package: { packageType: true },
        spaTherapist: true,
        spaService: true,
      },
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
      const isMassage = sessionType === SessionType.MASSAGE;
      const reservation = em.create(Reservation, {
        userId: user.id,
        trainerId: slot.trainerId,
        packageId: pkg.id,
        timeSlotId: slot.id,
        tenantId: user.tenantId,
        sessionType,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: isMassage ? ReservationStatus.PENDING : ReservationStatus.CONFIRMED,
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

    if (result.status === ReservationStatus.CONFIRMED) {
      void this.afterReservationCreated(user, result).catch((cause: unknown) => {
        const msg = cause instanceof Error ? cause.message : String(cause);
        this.logger.error(`afterReservationCreated failed: ${msg}`);
      });
    } else {
      void this.afterReservationPending(user, result).catch((cause: unknown) => {
        const msg = cause instanceof Error ? cause.message : String(cause);
        this.logger.error(`afterReservationPending failed: ${msg}`);
      });
    }
    return result;
  }

  async listPendingMassageReservations(tenantId: string) {
    const rows = await this.reservationsRepo.find({
      where: {
        tenantId,
        sessionType: SessionType.MASSAGE,
        status: ReservationStatus.PENDING,
      },
      relations: {
        user: true,
        trainer: { user: true },
        package: { packageType: true },
        timeSlot: true,
      },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return rows.map((r) => this.toReservationResponse(r));
  }

  async approveReservationByAdmin(tenantId: string, reservationId: string) {
    const row = await this.reservationsRepo.findOne({
      where: { id: reservationId, tenantId, status: ReservationStatus.PENDING },
      relations: {
        user: true,
        trainer: { user: true },
        package: { packageType: true },
        timeSlot: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Pending reservation not found');
    }
    row.status = ReservationStatus.CONFIRMED;
    await this.reservationsRepo.save(row);
    const view = this.toReservationResponse(row);
    void this.afterReservationCreated(row.user, view).catch(() => {});
    return view;
  }

  async rejectReservationByAdmin(tenantId: string, reservationId: string) {
    let memberEmailTarget: User | null = null;
    const view = await this.dataSource.transaction(async (em) => {
      const reservation = await em
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: reservationId })
        .andWhere('r.tenantId = :tenantId', { tenantId })
        .andWhere('r.status = :status', { status: ReservationStatus.PENDING })
        .getOne();
      if (!reservation) {
        throw new NotFoundException('Pending reservation not found');
      }
      memberEmailTarget = await em.findOne(User, { where: { id: reservation.userId } });
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
        relations: {
          user: true,
          trainer: { user: true },
          package: { packageType: true },
          timeSlot: true,
        },
      });
      return this.toReservationResponse(full!);
    });
    if (memberEmailTarget) {
      void this.afterReservationRejected(memberEmailTarget, view).catch(() => {});
    }
    return view;
  }

  async cancelReservation(user: User, reservationId: string) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can cancel their reservations');
    }

    const result: MemberReservationView = await this.dataSource.transaction(async (em) => {
      const reservation = await em
        .createQueryBuilder(Reservation, 'r')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('r.timeSlot', 'slot')
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

  async listMyNotifications(user: User, limit = 50) {
    const rows = await this.notificationsRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));
  }

  async markNotificationRead(user: User, notificationId: string) {
    const row = await this.notificationsRepo.findOne({
      where: { id: notificationId, userId: user.id },
    });
    if (!row) {
      throw new NotFoundException('Notification not found');
    }
    if (!row.isRead) {
      row.isRead = true;
      row.readAt = new Date();
      await this.notificationsRepo.save(row);
    }
    return { ok: true as const, id: row.id, isRead: row.isRead, readAt: row.readAt };
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
    const trainerName =
      `${res.trainer?.user?.firstName ?? ''} ${res.trainer?.user?.lastName ?? ''}`.trim() ||
      'Eğitmen';
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
    await this.sendPushToUser(member.id, 'Rezervasyon onaylandi', bodyLine);

    await this.mail.sendReservationConfirmed({
      to: member.email,
      memberFirstName: member.firstName,
      clubName,
      trainerName,
      sessionType: res.sessionType,
      startTime: new Date(res.startTime),
      endTime: new Date(res.endTime),
      packageTypeName: res.package?.packageTypeName ?? '',
      remainingSessions: res.package?.remainingSessions ?? 0,
    });
  }

  private async afterReservationPending(
    member: User,
    res: Pick<MemberReservationView, 'id' | 'startTime' | 'endTime' | 'trainer'>,
  ): Promise<void> {
    const trainerName =
      `${res.trainer?.user?.firstName ?? ''} ${res.trainer?.user?.lastName ?? ''}`.trim() ||
      'Eğitmen';
    const { locale, timeZone } = this.getMailFormatting();
    const { dateLine, timeLine } = formatDateRange(
      new Date(res.startTime),
      new Date(res.endTime),
      locale,
      timeZone,
    );
    const bodyLine = `Talep alındı: ${trainerName} — ${dateLine} ${timeLine}`;
    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        userId: member.id,
        type: NotificationType.RESERVATION,
        title: 'Rezervasyon talebiniz alındı',
        body: bodyLine,
        data: { reservationId: res.id },
        isRead: false,
        readAt: null,
      }),
    );
    await this.sendPushToUser(member.id, 'Rezervasyon talebiniz alındı', bodyLine);
  }

  private async afterReservationRejected(
    member: User,
    res: Pick<MemberReservationView, 'id' | 'startTime' | 'endTime' | 'trainer' | 'package'>,
  ): Promise<void> {
    const trainerName =
      `${res.trainer?.user?.firstName ?? ''} ${res.trainer?.user?.lastName ?? ''}`.trim() ||
      'Eğitmen';
    const { locale, timeZone } = this.getMailFormatting();
    const { dateLine, timeLine } = formatDateRange(
      new Date(res.startTime),
      new Date(res.endTime),
      locale,
      timeZone,
    );
    const bodyLine = `Onaylanmadı: ${trainerName} — ${dateLine} ${timeLine}`;
    await this.notificationsRepo.save(
      this.notificationsRepo.create({
        userId: member.id,
        type: NotificationType.RESERVATION,
        title: 'Rezervasyon talebiniz onaylanmadı',
        body: bodyLine,
        data: { reservationId: res.id },
        isRead: false,
        readAt: null,
      }),
    );
    await this.sendPushToUser(member.id, 'Rezervasyon talebiniz onaylanmadı', bodyLine);
    await this.mail.sendReservationCancelled({
      to: member.email,
      memberFirstName: member.firstName,
      clubName: 'Kulüp',
      trainerName,
      sessionType: SessionType.MASSAGE,
      startTime: new Date(res.startTime),
      endTime: new Date(res.endTime),
      remainingSessions: res.package?.remainingSessions ?? 0,
    });
  }

  private async afterReservationCancelled(
    member: User,
    res: {
      id: string;
      sessionType: SessionType;
      startTime: Date;
      endTime: Date;
      trainer: { user: { firstName: string; lastName: string } } | null;
      package: { remainingSessions: number } | null;
    },
  ): Promise<void> {
    const tenant = await this.tenantsRepo.findOne({
      where: { id: member.tenantId },
      select: ['name'],
    });
    const clubName = tenant?.name ?? 'Kulüp';
    const trainerName =
      `${res.trainer?.user?.firstName ?? ''} ${res.trainer?.user?.lastName ?? ''}`.trim() ||
      'Eğitmen';
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
    await this.sendPushToUser(member.id, 'Rezervasyon iptal edildi', bodyLine);

    await this.mail.sendReservationCancelled({
      to: member.email,
      memberFirstName: member.firstName,
      clubName,
      trainerName,
      sessionType: res.sessionType,
      startTime: new Date(res.startTime),
      endTime: new Date(res.endTime),
      remainingSessions: res.package?.remainingSessions ?? 0,
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
      trainer: r.trainer
        ? {
            id: r.trainer.id,
            user: {
              firstName: r.trainer.user?.firstName ?? '',
              lastName: r.trainer.user?.lastName ?? '',
            },
          }
        : null,
      timeSlot: r.timeSlot
        ? {
            id: r.timeSlot.id,
            startTime: r.timeSlot.startTime,
            endTime: r.timeSlot.endTime,
          }
        : null,
      package: r.package
        ? {
            id: r.package.id,
            remainingSessions: r.package.remainingSessions,
            status: r.package.status,
            packageTypeName: r.package.packageType?.name ?? '',
          }
        : null,
      spaTherapist: r.spaTherapist ? { id: r.spaTherapist.id, name: r.spaTherapist.name } : null,
      spaService: r.spaService
        ? {
            id: r.spaService.id,
            name: r.spaService.name,
            durationMinutes: r.spaService.durationMinutes,
          }
        : null,
    };
  }

  private async sendPushToUser(userId: string, title: string, body: string) {
    try {
      const user = await this.usersRepo.findOne({
        where: { id: userId },
        select: ['id', 'notificationPreferences'],
      });
      const rawToken =
        user?.notificationPreferences &&
        typeof user.notificationPreferences === 'object' &&
        'expoPushToken' in user.notificationPreferences
          ? user.notificationPreferences.expoPushToken
          : null;
      const token = typeof rawToken === 'string' ? rawToken.trim() : '';
      if (!token) {
        return;
      }
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          title,
          body,
          sound: 'default',
        }),
      });
    } catch {
      // keep reservation flow resilient even if push delivery fails
    }
  }
}
