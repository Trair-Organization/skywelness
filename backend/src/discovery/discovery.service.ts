import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { User } from '../database/entities/user.entity';

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(TrainerProfile) private readonly profilesRepo: Repository<TrainerProfile>,
    @InjectRepository(ClubEvent) private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  /** Keşif: Tüm kulüpler (featured önce, sonra isim sırasına göre). */
  async listClubs(limit = 20) {
    const rows = await this.tenantsRepo.find({
      order: { featured: 'DESC', name: 'ASC' },
      take: Math.min(limit, 50),
    });
    return rows
      .filter(
        (t) =>
          !t.subdomain.startsWith('coach-') &&
          !t.subdomain.startsWith('e2e') &&
          t.subdomain !== 'independent-hub' &&
          t.subdomain !== 'demo' &&
          // Private + non-featured kulüpleri keşif'ten gizle (ör. SkyCafe — sadece üyelerine görünür)
          !(t.visibilityMode === 'private' && !t.featured),
      )
      .map((t) => ({
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        vertical: t.vertical,
        visibilityMode: t.visibilityMode,
        description: t.description,
        location: t.location,
        logoUrl: t.logoUrl ?? this.extractLegacyLogo(t.branding),
        coverImageUrl: t.coverImageUrl ?? (t.galleryImages?.length > 0 ? t.galleryImages[0] : null),
        galleryImages: t.galleryImages ?? [],
        services: t.services ?? [],
        priceRange: t.priceRange,
        featured: t.featured,
        avgRating: t.avgRating,
        reviewCount: t.reviewCount,
        phone: t.phone,
        email: t.email,
      }));
  }

  /** Keşif: Öne çıkan kulüpler. */
  async listFeaturedClubs(limit = 6) {
    const rows = await this.tenantsRepo.find({
      where: { featured: true },
      order: { name: 'ASC' },
      take: Math.min(limit, 10),
    });
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      subdomain: t.subdomain,
      vertical: t.vertical,
      visibilityMode: t.visibilityMode,
      description: t.description,
      location: t.location,
      logoUrl: t.logoUrl ?? this.extractLegacyLogo(t.branding),
      coverImageUrl: t.coverImageUrl,
      services: t.services ?? [],
      priceRange: t.priceRange,
      avgRating: t.avgRating,
      reviewCount: t.reviewCount,
    }));
  }

  /** Keşif: Onaylı eğitmenler (profil bilgileriyle). */
  async listTrainers(limit = 20) {
    const profiles = await this.profilesRepo.find({
      relations: ['user', 'trainer', 'tenant'],
      where: { tenant: { featured: true } },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 50),
    });

    return profiles.map((p) => ({
      id: p.trainerId,
      userId: p.userId,
      name: `${p.user.firstName} ${p.user.lastName}`.trim(),
      photoUrl: p.photoUrl ?? p.user.photoUrl,
      city: p.city,
      bio: p.bio,
      specialties: p.specialties ?? [],
      certifications: p.certifications ?? [],
      experienceYears: p.experienceYears,
      pricingNote: p.pricingNote,
      avgRating: p.trainer.avgRating,
      totalSessions: p.trainer.totalSessions,
      clubName: p.tenant.name,
      clubSubdomain: p.tenant.subdomain,
    }));
  }

  /** Keşif: Yaklaşan public etkinlikler (tüm kulüplerden). */
  async listUpcomingEvents(limit = 10) {
    const now = new Date();
    const events = await this.eventsRepo.find({
      where: { startsAt: MoreThanOrEqual(now) },
      relations: ['tenant'],
      order: { startsAt: 'ASC' },
      take: Math.min(limit, 30),
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      coachName: e.coachName,
      location: e.location,
      imageUrl: e.imageUrl,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      capacity: e.capacity,
      category: e.category ?? 'general',
      requirements: e.requirements,
      schedule: e.schedule,
      price: e.price ?? '0',
      currency: e.currency ?? 'TRY',
      clubName: e.tenant?.name ?? null,
      clubSubdomain: e.tenant?.subdomain ?? null,
    }));
  }

  private extractLegacyLogo(branding: Record<string, unknown> | null): string | null {
    if (!branding) return null;
    const url = branding['logoUrl'] ?? branding['logo'];
    return typeof url === 'string' && url.trim() ? url.trim() : null;
  }
}
