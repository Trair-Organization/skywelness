import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Availability } from '../database/entities/availability.entity';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { PackageStatus, ReservationStatus, SessionType } from '../database/enums';

@Injectable()
export class PtMemberService {
  constructor(
    @InjectRepository(Availability) private readonly availabilityRepo: Repository<Availability>,
    @InjectRepository(Reservation) private readonly reservationsRepo: Repository<Reservation>,
    @InjectRepository(Package) private readonly memberPackagesRepo: Repository<Package>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
  ) {}

  /** Üye: Belirli bir tarih için müsait PT slotları. */
  async getAvailableSlots(date: string) {
    // Get all available slots for trainers on the given date
    const slots = await this.availabilityRepo.find({
      where: {
        date,
        available: true,
      },
      relations: ['trainer', 'trainer.user'],
    });

    // Filter only slots that have a trainerId
    const ptSlots = slots.filter((s) => s.trainerId !== null && s.trainer !== null);

    // For each slot, check if there's already a confirmed/pending reservation
    const availableSlots: Array<{
      availabilityId: string;
      trainerId: string;
      trainerName: string;
      trainerPhoto: string | null;
      startTime: string;
      endTime: string;
    }> = [];

    for (const slot of ptSlots) {
      const slotStart = new Date(`${date}T${slot.startTime}`);

      const existingReservation = await this.reservationsRepo.findOne({
        where: {
          trainerId: slot.trainerId!,
          startTime: slotStart,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
        },
      });

      if (!existingReservation) {
        const trainerName = slot.trainer?.user
          ? `${slot.trainer.user.firstName} ${slot.trainer.user.lastName}`.trim()
          : 'Unknown';
        availableSlots.push({
          availabilityId: slot.id,
          trainerId: slot.trainerId!,
          trainerName,
          trainerPhoto: slot.trainer?.photoUrl ?? null,
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

  /** Üye: PT paketi bakiyesi. */
  async getMyPackageBalance(userId: string) {
    const packages = await this.memberPackagesRepo.find({
      where: {
        userId,
        status: PackageStatus.ACTIVE,
      },
      relations: ['packageType'],
    });

    const ptPackages = packages.filter(
      (p) => p.packageType && p.packageType.sessionType === SessionType.PERSONAL_TRAINING,
    );

    const remainingSessions = ptPackages.reduce((sum, p) => sum + p.remainingSessions, 0);

    return {
      remainingSessions,
      packages: ptPackages.map((p) => ({
        id: p.id,
        packageTypeName: p.packageType.name,
        remainingSessions: p.remainingSessions,
        expiresAt: p.expiresAt,
        status: p.status,
      })),
    };
  }

  /** Üye: Müsait PT slot'unu rezerve et. */
  async bookSlot(userId: string, tenantId: string, availabilityId: string) {
    // 1. Validate availability exists and is for today or future
    const availability = await this.availabilityRepo.findOne({
      where: { id: availabilityId, available: true },
      relations: ['trainer'],
    });
    if (!availability) {
      throw new NotFoundException('Availability slot not found or not available');
    }
    if (!availability.trainerId) {
      throw new BadRequestException('This slot is not for a trainer');
    }

    const today = new Date().toISOString().slice(0, 10);
    if (availability.date < today) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    // 2. Validate no existing confirmed/pending reservation for that trainer+time
    const slotStart = new Date(`${availability.date}T${availability.startTime}`);
    const slotEnd = new Date(`${availability.date}T${availability.endTime}`);

    const existingReservation = await this.reservationsRepo.findOne({
      where: {
        trainerId: availability.trainerId,
        startTime: slotStart,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
      },
    });
    if (existingReservation) {
      throw new BadRequestException('This slot is already booked');
    }

    // 3. Check member has active PT package with remainingSessions > 0
    const packages = await this.memberPackagesRepo.find({
      where: {
        userId,
        status: PackageStatus.ACTIVE,
      },
      relations: ['packageType'],
    });

    const ptPackage = packages.find(
      (p) =>
        p.packageType &&
        p.packageType.sessionType === SessionType.PERSONAL_TRAINING &&
        p.remainingSessions > 0 &&
        p.expiresAt >= today,
    );
    if (!ptPackage) {
      throw new BadRequestException('No active personal training package with remaining sessions');
    }

    // 4. Deduct 1 session from the package
    ptPackage.remainingSessions -= 1;
    if (ptPackage.remainingSessions === 0) {
      ptPackage.status = PackageStatus.DEPLETED;
    }
    await this.memberPackagesRepo.save(ptPackage);

    // 5. Create a Reservation record (pending — eğitmen onayı gerekli)
    const reservation = this.reservationsRepo.create({
      userId,
      tenantId,
      trainerId: availability.trainerId,
      packageId: ptPackage.id,
      sessionType: SessionType.PERSONAL_TRAINING,
      startTime: slotStart,
      endTime: slotEnd,
      status: ReservationStatus.PENDING,
      notes: null,
      cancelledAt: null,
    });
    const saved = await this.reservationsRepo.save(reservation);

    return saved;
  }

  /** Üye: PT rezervasyonunu iptal et (3 saat kuralı). */
  async cancelPtReservation(userId: string, reservationId: string) {
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

    // If more than 3 hours before start → refund 1 session
    if (diffMs > threeHoursMs && reservation.packageId) {
      const pkg = await this.memberPackagesRepo.findOne({
        where: { id: reservation.packageId },
      });
      if (pkg) {
        pkg.remainingSessions += 1;
        if (pkg.status === PackageStatus.DEPLETED && pkg.remainingSessions > 0) {
          pkg.status = PackageStatus.ACTIVE;
        }
        await this.memberPackagesRepo.save(pkg);
        refunded = true;
      }
    }

    const message = refunded
      ? 'Reservation cancelled. 1 session refunded to your package.'
      : 'Reservation cancelled. No refund (less than 3 hours before start).';

    return { refunded, message };
  }
}
