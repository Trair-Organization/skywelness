import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberAccountStatus } from '../database/enums';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { User } from '../database/entities/user.entity';

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(TrainerApplication)
    private readonly trainerApplicationsRepo: Repository<TrainerApplication>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async listPendingTrainerApplications() {
    const rows = await this.trainerApplicationsRepo.find({
      where: { status: 'pending' },
      relations: { user: true, trainer: true, tenant: true },
      order: { createdAt: 'ASC' },
    });
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      trainer: {
        id: row.trainerId,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
        phone: row.user.phone,
        tenantSubdomain: row.tenant.subdomain,
        offersSessionTypes: row.trainer.offersSessionTypes,
        specialties: row.trainer.specializations,
        preferredClubSubdomain: row.preferredClubSubdomain,
      },
    }));
  }

  async approveTrainerApplication(applicationId: string, reviewer: User, note?: string) {
    const app = await this.trainerApplicationsRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('Trainer application not found');
    }
    if (app.status !== 'pending') {
      throw new BadRequestException('Trainer application already reviewed');
    }
    await this.trainerApplicationsRepo.update(
      { id: app.id },
      {
        status: 'approved',
        adminNote: note?.trim() || null,
        reviewedByUserId: reviewer.id,
        reviewedAt: new Date(),
      },
    );
    await this.usersRepo.update({ id: app.userId }, { accountStatus: MemberAccountStatus.ACTIVE });
    return { ok: true };
  }

  async rejectTrainerApplication(applicationId: string, reviewer: User, note?: string) {
    const app = await this.trainerApplicationsRepo.findOne({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundException('Trainer application not found');
    }
    if (app.status !== 'pending') {
      throw new BadRequestException('Trainer application already reviewed');
    }
    await this.trainerApplicationsRepo.update(
      { id: app.id },
      {
        status: 'rejected',
        adminNote: note?.trim() || null,
        reviewedByUserId: reviewer.id,
        reviewedAt: new Date(),
      },
    );
    await this.usersRepo.update(
      { id: app.userId },
      { accountStatus: MemberAccountStatus.REJECTED },
    );
    return { ok: true };
  }
}
