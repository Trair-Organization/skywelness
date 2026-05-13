import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trainer } from '../database/entities/trainer.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Resource } from '../database/entities/resource.entity';
import { PackageType } from '../database/entities/package-type.entity';

/**
 * Public eğitmen profil endpoint'i.
 * Keşif'ten veya kulüp sayfasından eğitmen kartına tıklanınca çağrılır.
 */
@Controller('trainers')
export class TrainerPublicProfileController {
  constructor(
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Resource) private readonly resourcesRepo: Repository<Resource>,
    @InjectRepository(PackageType) private readonly packageTypesRepo: Repository<PackageType>,
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

    // Eğitmenin hizmetleri
    const services = await this.resourcesRepo.find({
      where: { tenantId: trainer.tenantId, active: true },
      order: { sortOrder: 'ASC' },
    });

    // Eğitmenin paketleri
    const packages = await this.packageTypesRepo.find({
      where: { tenantId: trainer.tenantId, active: true },
      order: { createdAt: 'ASC' },
    });

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
      services: services.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        durationMinutes: r.durationMinutes,
        price: r.price,
        currency: r.currency,
        capacity: r.capacity,
      })),
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        sessionCount: p.sessionCount,
        price: p.price,
        currency: p.currency,
        validityDays: p.validityDays,
        sessionType: p.sessionType,
      })),
    };
  }
}
