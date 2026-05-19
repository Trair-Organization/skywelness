import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { Resource } from '../database/entities/resource.entity';
import { ResourceSlot } from '../database/entities/resource-slot.entity';
import { Booking } from '../database/entities/booking.entity';
import { User } from '../database/entities/user.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { ServiceCatalog } from '../database/entities/service-catalog.entity';
import { MemberAccountStatus, UserRole } from '../database/enums';

/**
 * Partner profil sayfası için tüm verileri toplayan servis.
 * Tek endpoint'te: tenant info, galeri, eğitmenler, kaynaklar, etkinlikler,
 * paketler, metrikler.
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
    @InjectRepository(ClubEvent) private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(PackageType) private readonly packageTypesRepo: Repository<PackageType>,
    @InjectRepository(ServiceCatalog) private readonly servicesRepo: Repository<ServiceCatalog>,
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

    // Unified hizmetler (service_catalog)
    const services = await this.servicesRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { sortOrder: 'ASC' },
    });

    // Yaklaşan etkinlikler
    const now = new Date();
    const events = await this.eventsRepo.find({
      where: { tenantId: tenant.id, startsAt: MoreThanOrEqual(now) },
      order: { startsAt: 'ASC' },
      take: 10,
    });

    // Paketler (aktif)
    const packages = await this.packageTypesRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { createdAt: 'ASC' },
    });

    // Sosyal kanıt metrikleri
    const [memberCount, totalBookings, completedBookings] = await Promise.all([
      this.usersRepo.count({
        where: {
          tenantId: tenant.id,
          role: UserRole.MEMBER,
          accountStatus: MemberAccountStatus.ACTIVE,
        },
      }),
      this.bookingsRepo.count({ where: { tenantId: tenant.id } }),
      this.bookingsRepo.count({ where: { tenantId: tenant.id, status: 'completed' } }),
    ]);

    // Bu ay yapılan rezervasyon sayısı (sosyal kanıt)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthBookings = await this.bookingsRepo
      .createQueryBuilder('b')
      .where('b.tenantId = :tid', { tid: tenant.id })
      .andWhere('b.createdAt >= :start', { start: monthStart })
      .getCount();

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
      avgRating: tenant.avgRating,
      reviewCount: tenant.reviewCount,
      priceRange: tenant.priceRange,

      // Profil tipi
      profileType: isIndependentTrainer ? 'trainer' : isPartnerClub ? 'club' : 'other',

      // Eğitmenler
      trainers: trainers.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: `${t.user.firstName} ${t.user.lastName}`.trim(),
        photoUrl: t.photoUrl ?? t.user.photoUrl,
        specializations: t.specializations ?? [],
        offersSessionTypes: t.offersSessionTypes ?? [],
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

      // Unified hizmetler (service_catalog)
      catalogServices: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        providerType: s.providerType,
        durationMinutes: s.durationMinutes,
        price: s.price,
        currency: s.currency,
        capacity: s.capacity,
        imageUrl: s.imageUrl,
      })),

      // Yaklaşan etkinlikler
      events: events.map((e) => ({
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
        price: e.price ?? '0',
        currency: e.currency ?? 'TRY',
      })),

      // Paketler & Fiyatlar
      packages: packages.map((p) => ({
        id: p.id,
        name: p.name,
        sessionCount: p.sessionCount,
        price: p.price,
        currency: p.currency,
        validityDays: p.validityDays,
        sessionType: p.sessionType,
      })),

      // Sosyal kanıt
      metrics: {
        memberCount,
        totalBookings,
        completedBookings,
        trainerCount: trainers.length,
        thisMonthBookings,
      },
    };
  }

  /**
   * Profil sayfasındaki ajanda — belirli bir gün için müsait slotlar.
   */
  async getAvailableSlots(_user: User, subdomain: string, date?: string, resourceId?: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Partner bulunamadı');

    const targetDate = date || new Date().toISOString().slice(0, 10);

    const qb = this.slotsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.resource', 'r')
      .where('s.tenantId = :tid', { tid: tenant.id })
      .andWhere('s.date = :date', { date: targetDate })
      .andWhere('s.status = :status', { status: 'available' })
      .orderBy('s.startTime', 'ASC');

    if (resourceId) {
      qb.andWhere('s.resourceId = :rid', { rid: resourceId });
    }

    const slots = await qb.getMany();

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
