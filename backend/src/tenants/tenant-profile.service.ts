import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { Resource } from '../database/entities/resource.entity';
import { ResourceSlot } from '../database/entities/resource-slot.entity';
import { Booking } from '../database/entities/booking.entity';
import { User } from '../database/entities/user.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';

/**
 * Partner profil sayfası için tüm verileri toplayan servis.
 * Tek endpoint'te: tenant info, galeri, eğitmenler, kaynaklar, metrikler.
 */
@Injectable()
export class TenantProfileService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(Resource) private readonly resourcesRepo: Repository<Resource>,
    @InjectRepository(ResourceSlot) private readonly slotsRepo: Repository<ResourceSlot>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async getProfile(subdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Partner bulunamadı');

    // Eğitmenler
    const trainers = await this.trainersRepo.find({
      where: { tenantId: tenant.id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    // Kaynaklar (kortlar, odalar vs.)
    const resources = await this.resourcesRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { sortOrder: 'ASC' },
    });

    // Sosyal kanıt metrikleri
    const [memberCount, totalBookings, completedBookings] = await Promise.all([
      this.usersRepo.count({
        where: { tenantId: tenant.id, role: UserRole.MEMBER, accountStatus: MemberAccountStatus.ACTIVE },
      }),
      this.bookingsRepo.count({ where: { tenantId: tenant.id } }),
      this.bookingsRepo.count({ where: { tenantId: tenant.id, status: 'completed' } }),
    ]);

    // Workspace type'a göre profil tipi belirle
    const workspaceType = (tenant.settings as { workspaceType?: string } | null)?.workspaceType;
    const isIndependentTrainer = workspaceType === 'independent_trainer';
    const isPartnerClub = workspaceType === 'partner_club';

    return {
      // Temel bilgiler
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      description: tenant.description,
      location: tenant.location,
      logoUrl: tenant.logoUrl,
      coverImageUrl: tenant.coverImageUrl,
      galleryImages: tenant.galleryImages ?? [],
      services: tenant.services ?? [],
      vertical: tenant.vertical,
      visibilityMode: tenant.visibilityMode,
      phone: tenant.phone,
      email: tenant.email,
      website: tenant.website,
      avgRating: tenant.avgRating,
      reviewCount: tenant.reviewCount,
      priceRange: tenant.priceRange,

      // Profil tipi
      profileType: isIndependentTrainer
        ? 'trainer'
        : isPartnerClub
          ? 'club'
          : 'other',

      // Eğitmenler (kulüp için)
      trainers: trainers.map((t) => ({
        id: t.id,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        photoUrl: t.photoUrl ?? t.user.photoUrl,
        specializations: t.specializations ?? [],
        avgRating: t.avgRating,
        totalSessions: t.totalSessions,
        bio: t.bio,
      })),

      // Kaynaklar / Hizmetler (booking yapılabilir)
      resources: resources.map((r) => ({
        id: r.id,
        name: r.name,
        resourceType: r.resourceType,
        capacity: r.capacity,
        durationMinutes: r.durationMinutes,
        price: r.price,
        currency: r.currency,
        description: r.description,
        imageUrl: r.imageUrl,
      })),

      // Sosyal kanıt
      metrics: {
        memberCount,
        totalBookings,
        completedBookings,
        trainerCount: trainers.length,
      },
    };
  }

  /**
   * Profil sayfasındaki ajanda — belirli bir gün için müsait slotlar.
   * Public kulüpte herkes görebilir, private'da membership check yapılır.
   */
  async getAvailableSlots(
    user: User,
    subdomain: string,
    date?: string,
    resourceId?: string,
  ) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Partner bulunamadı');

    const targetDate = date || new Date().toISOString().slice(0, 10);

    const where: Record<string, unknown> = {
      tenantId: tenant.id,
      date: targetDate,
      status: 'available',
    };
    if (resourceId) {
      where.resourceId = resourceId;
    }

    const slots = await this.slotsRepo.find({
      where: where as never,
      relations: ['resource'],
      order: { startTime: 'ASC' },
    });

    return {
      date: targetDate,
      slots: slots.map((s) => ({
        id: s.id,
        resourceId: s.resourceId,
        resourceName: s.resource?.name ?? '',
        startTime: s.startTime,
        endTime: s.endTime,
        price: s.price ?? s.resource?.price ?? '0',
      })),
    };
  }
}
