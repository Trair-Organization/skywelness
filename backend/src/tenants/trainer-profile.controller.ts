import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trainer } from '../database/entities/trainer.entity';
import { Tenant } from '../database/entities/tenant.entity';

/**
 * Public eğitmen profil endpoint'i.
 * Keşif'ten veya kulüp sayfasından eğitmen kartına tıklanınca çağrılır.
 */
@Controller('trainers')
export class TrainerPublicProfileController {
  constructor(
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  @Get(':trainerId/profile')
  async getTrainerProfile(
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
  ) {
    const trainer = await this.trainersRepo.findOne({
      where: { id: trainerId },
      relations: ['user'],
    });
    if (!trainer) {
      return { error: 'Trainer not found' };
    }

    const tenant = await this.tenantsRepo.findOne({ where: { id: trainer.tenantId } });

    return {
      id: trainer.id,
      userId: trainer.userId,
      name: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
      photoUrl: trainer.photoUrl ?? trainer.user.photoUrl,
      bio: trainer.bio,
      specializations: trainer.specializations ?? [],
      certifications: trainer.certifications ?? [],
      avgRating: trainer.avgRating,
      totalSessions: trainer.totalSessions,
      offersSessionTypes: trainer.offersSessionTypes ?? [],
      club: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            logoUrl: tenant.logoUrl,
            location: tenant.location,
          }
        : null,
    };
  }
}
