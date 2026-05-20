import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Trainer } from '../database/entities/trainer.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Resource } from '../database/entities/resource.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { User } from '../database/entities/user.entity';
import { Availability } from '../database/entities/availability.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { ReservationStatus } from '../database/enums';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public eğitmen profil endpoint'i.
 * Keşif'ten veya kulüp sayfasından eğitmen kartına tıklanınca çağrılır.
 *
 * URL parametresi UUID veya publicId (örn. EGT-4R8N) kabul eder.
 */
@Controller('trainers')
export class TrainerPublicProfileController {
  constructor(
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Resource) private readonly resourcesRepo: Repository<Resource>,
    @InjectRepository(PackageType) private readonly packageTypesRepo: Repository<PackageType>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Availability) private readonly availRepo: Repository<Availability>,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
  ) {}

  @Get(':slug/profile')
  async getTrainerProfile(@Param('slug') slug: string) {
    let trainer: Trainer | null = null;

    if (UUID_RE.test(slug)) {
      // UUID — eski URL'ler için geriye uyumluluk
      trainer = await this.trainersRepo.findOne({
        where: { id: slug },
        relations: ['user'],
      });
    } else if (/^[A-Z]{3}-[A-Z0-9]+$/i.test(slug)) {
      // publicId formatı (EGT-XXXX) — backward compat
      const upper = slug.toUpperCase();
      const user = await this.usersRepo.findOne({ where: { publicId: upper } });
      if (user) {
        trainer = await this.trainersRepo.findOne({
          where: { userId: user.id },
          relations: ['user'],
        });
      }
    } else {
      // SEO slug (örn. baha-citir)
      const lower = slug.toLowerCase();
      const user = await this.usersRepo.findOne({ where: { slug: lower } });
      if (user) {
        trainer = await this.trainersRepo.findOne({
          where: { userId: user.id },
          relations: ['user'],
        });
      }
    }

    if (!trainer) {
      return { error: 'Trainer not found' };
    }

    const tenant = await this.tenantsRepo.findOne({ where: { id: trainer.tenantId } });

    // Eğitmenin hizmetleri
    const services = await this.resourcesRepo.find({
      where: { tenantId: trainer.tenantId, active: true },
      order: { sortOrder: 'ASC' },
    });

    // Eğitmenin paketleri — sadece bu eğitmenin sunduğu session type'larına uygun olanlar
    const offers = trainer.offersSessionTypes ?? [];
    const allPackages = await this.packageTypesRepo.find({
      where: { tenantId: trainer.tenantId, active: true },
      order: { createdAt: 'ASC' },
    });
    const packages = offers.length
      ? allPackages.filter((p) => offers.includes(p.sessionType))
      : allPackages;

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

  /**
   * Public: Eğitmenin belirli bir tarihteki müsait slotları.
   * Eğitmen panelinde / kulüp PT yönetiminde oluşturulan availability tablosundan çeker.
   * Rezervasyonu olan slotlar listeden çıkarılır.
   */
  @Get(':slug/slots')
  async getTrainerSlots(@Param('slug') slug: string, @Query('date') date: string) {
    let trainer: Trainer | null = null;
    if (UUID_RE.test(slug)) {
      trainer = await this.trainersRepo.findOne({ where: { id: slug } });
    } else if (/^[A-Z]{3}-[A-Z0-9]+$/i.test(slug)) {
      const user = await this.usersRepo.findOne({ where: { publicId: slug.toUpperCase() } });
      if (user) trainer = await this.trainersRepo.findOne({ where: { userId: user.id } });
    } else {
      const user = await this.usersRepo.findOne({ where: { slug: slug.toLowerCase() } });
      if (user) trainer = await this.trainersRepo.findOne({ where: { userId: user.id } });
    }
    if (!trainer) return [];

    const dateStr = date.slice(0, 10);
    const dayStart = new Date(`${dateStr}T00:00:00Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59Z`);

    const [slots, lessons] = await Promise.all([
      this.availRepo.find({
        where: { trainerId: trainer.id, date: dateStr, available: true },
        order: { startTime: 'ASC' },
      }),
      this.resRepo.find({
        where: {
          trainerId: trainer.id,
          status: In([ReservationStatus.CONFIRMED, ReservationStatus.PENDING]),
          startTime: Between(dayStart, dayEnd),
        },
      }),
    ]);

    // Dolu saatleri set yap
    const bookedHours = new Set(
      lessons.map((l) => new Date(l.startTime).toISOString().slice(11, 16)),
    );

    // Bugün ise geçmiş saatleri filtrele (TR saati ile karşılaştır)
    const now = new Date();
    const trNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const todayStr = trNow.toISOString().slice(0, 10);
    const isToday = dateStr === todayStr;
    const currentHourMin = isToday ? trNow.toISOString().slice(11, 16) : null;

    return slots
      .filter((s) => !bookedHours.has(s.startTime.slice(0, 5)))
      .filter((s) => !isToday || (currentHourMin !== null && s.startTime.slice(0, 5) > currentHourMin))
      .reduce<Array<{ id: string; date: string; startTime: string; endTime: string }>>((acc, s) => {
        const startHM = s.startTime.slice(0, 5);
        // Aynı saat için sadece ilk slotu al (duplicate temizliği)
        if (acc.some((existing) => existing.startTime === startHM)) return acc;
        acc.push({
          id: s.id,
          date: typeof s.date === 'string' ? s.date : new Date(s.date).toISOString().slice(0, 10),
          startTime: startHM,
          endTime: s.endTime.slice(0, 5),
        });
        return acc;
      }, []);
  }
}
