import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { PackageRequest } from '../database/entities/package-request.entity';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { TimeSlot } from '../database/entities/time-slot.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { WaitingListEntry } from '../database/entities/waiting-list.entity';
import {
  PackageStatus,
  ReservationStatus,
  SessionType,
  UserRole,
  WaitingListStatus,
} from '../database/enums';
import type { User } from '../database/entities/user.entity';
import type { CreatePackageRequestDto } from './dto/create-package-request.dto';
import type { CreateReservationDto } from './dto/create-reservation.dto';
import type { JoinWaitingListDto } from './dto/join-waiting-list.dto';

const WAITLIST_NOTIFICATION_HOLD_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TimeSlot) private readonly slotsRepo: Repository<TimeSlot>,
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
    @InjectRepository(Package) private readonly packagesRepo: Repository<Package>,
    @InjectRepository(PackageRequest)
    private readonly packageRequestsRepo: Repository<PackageRequest>,
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
    const row = this.packageRequestsRepo.create({
      userId: user.id,
      tenantId: user.tenantId,
      sessionType: sessionTypeEnum,
      message: dto.message?.trim() ? dto.message.trim() : null,
      status: 'pending',
    });
    await this.packageRequestsRepo.save(row);
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

    return this.dataSource.transaction(async (em) => {
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
  }

  async cancelReservation(user: User, reservationId: string) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can cancel their reservations');
    }

    return this.dataSource.transaction(async (em) => {
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

  private toReservationResponse(r: Reservation) {
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
