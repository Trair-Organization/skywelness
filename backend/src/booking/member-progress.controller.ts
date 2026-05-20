import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrainerMemberGoal } from '../database/entities/trainer-member-goal.entity';
import { TrainerMemberMeasurement } from '../database/entities/trainer-member-measurement.entity';
import { TrainerMemberPhoto } from '../database/entities/trainer-member-photo.entity';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';

/**
 * Üyenin kendi ilerleme verileri (eğitmen tarafından kaydedilen).
 * Üye sadece okuyabilir, değiştiremez.
 */
@Controller('me/progress')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER)
export class MemberProgressController {
  constructor(
    @InjectRepository(TrainerMemberGoal)
    private readonly goalsRepo: Repository<TrainerMemberGoal>,
    @InjectRepository(TrainerMemberMeasurement)
    private readonly measurementsRepo: Repository<TrainerMemberMeasurement>,
    @InjectRepository(TrainerMemberPhoto)
    private readonly photosRepo: Repository<TrainerMemberPhoto>,
  ) {}

  /** Üyenin tüm aktif hedefleri (tüm eğitmenlerinden) */
  @Get('goals')
  async listMyGoals(@CurrentUser() user: User) {
    const rows = await this.goalsRepo.find({
      where: { memberUserId: user.id },
      relations: ['trainer', 'trainer.user'],
      order: { status: 'ASC', startDate: 'DESC' },
    });
    return rows.map((g) => {
      const start = g.startValue ? parseFloat(g.startValue) : null;
      const current = g.currentValue ? parseFloat(g.currentValue) : null;
      const target = g.targetValue ? parseFloat(g.targetValue) : null;
      let progressPct: number | null = null;
      if (start !== null && current !== null && target !== null && start !== target) {
        progressPct = Math.max(
          0,
          Math.min(100, ((current - start) / (target - start)) * 100),
        );
      }
      return {
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        targetValue: g.targetValue,
        targetUnit: g.targetUnit,
        startValue: g.startValue,
        currentValue: g.currentValue,
        startDate: g.startDate,
        targetDate: g.targetDate,
        completedAt: g.completedAt,
        status: g.status,
        progressPct,
        trainerName: g.trainer?.user
          ? `${g.trainer.user.firstName} ${g.trainer.user.lastName}`.trim()
          : null,
      };
    });
  }

  /** Üyenin son ölçümleri */
  @Get('measurements')
  async listMyMeasurements(@CurrentUser() user: User) {
    const rows = await this.measurementsRepo.find({
      where: { memberUserId: user.id },
      order: { measuredAt: 'DESC' },
      take: 30,
    });
    return rows.map((m) => ({
      id: m.id,
      measuredAt: m.measuredAt,
      weightKg: m.weightKg,
      bodyFatPct: m.bodyFatPct,
      muscleMassKg: m.muscleMassKg,
      waistCm: m.waistCm,
      hipCm: m.hipCm,
      chestCm: m.chestCm,
    }));
  }

  /** Üyenin ilerleme fotoğrafları */
  @Get('photos')
  async listMyPhotos(@CurrentUser() user: User) {
    const rows = await this.photosRepo.find({
      where: { memberUserId: user.id },
      order: { takenAt: 'DESC' },
    });
    return rows.map((p) => ({
      id: p.id,
      takenAt: p.takenAt,
      photoUrl: p.photoUrl,
      tag: p.tag,
    }));
  }
}
