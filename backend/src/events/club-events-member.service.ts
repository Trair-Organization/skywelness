import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { EventWaitingList } from '../database/entities/event-waiting-list.entity';
import { EventReview } from '../database/entities/event-review.entity';
import { StripeService } from '../payments/stripe.service';
import { PushService } from '../notifications/push.service';
import type { User } from '../database/entities/user.entity';

export type ClubEventPublicRow = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  bookedCount: number;
  isJoined: boolean;
};

@Injectable()
export class ClubEventsMemberService {
  constructor(
    @InjectRepository(ClubEvent)
    private readonly eventRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly regRepo: Repository<ClubEventRegistration>,
    @InjectRepository(EventWaitingList)
    private readonly waitlistRepo: Repository<EventWaitingList>,
    @InjectRepository(EventReview)
    private readonly reviewRepo: Repository<EventReview>,
    private readonly stripeService: StripeService,
    private readonly dataSource: DataSource,
    private readonly pushService: PushService,
  ) {}

  async listUpcoming(user: User, limit = 20): Promise<ClubEventPublicRow[]> {
    const take = Math.min(Math.max(limit, 1), 50);
    const now = new Date();
    const events = await this.eventRepo.find({
      where: {
        tenantId: user.tenantId,
        published: true,
        startsAt: MoreThanOrEqual(now),
      },
      order: { startsAt: 'ASC' },
      take,
    });
    if (events.length === 0) {
      return [];
    }
    const ids = events.map((e) => e.id);
    const rawCounts = await this.regRepo
      .createQueryBuilder('r')
      .select('r.clubEventId', 'eventId')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.clubEventId IN (:...ids)', { ids })
      .groupBy('r.clubEventId')
      .getRawMany<{ eventId: string; cnt: string }>();
    const countMap = new Map(rawCounts.map((r) => [r.eventId, Number.parseInt(r.cnt, 10)]));

    const mine = await this.regRepo.find({
      where: { userId: user.id, clubEventId: In(ids) },
      select: ['clubEventId'],
    });
    const joined = new Set(mine.map((m) => m.clubEventId));

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      coachName: e.coachName,
      location: e.location,
      imageUrl: e.imageUrl,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      capacity: e.capacity,
      bookedCount: countMap.get(e.id) ?? 0,
      isJoined: joined.has(e.id),
    }));
  }

  async join(user: User, eventId: string): Promise<{ ok: true; paymentRequired?: boolean; checkoutUrl?: string }> {
    const now = new Date();
    return this.dataSource.transaction(async (em) => {
      const event = await em
        .getRepository(ClubEvent)
        .createQueryBuilder('e')
        .setLock('pessimistic_write')
        .where('e.id = :id', { id: eventId })
        .andWhere('e.tenantId = :tid', { tid: user.tenantId })
        .getOne();
      if (!event || !event.published) {
        throw new NotFoundException('Event not found');
      }
      if (event.startsAt <= now) {
        throw new BadRequestException('Event has already started');
      }
      const count = await em.count(ClubEventRegistration, { where: { clubEventId: event.id } });
      if (count >= event.capacity) {
        throw new ConflictException('Event is full');
      }
      const existing = await em.findOne(ClubEventRegistration, {
        where: { clubEventId: event.id, userId: user.id },
      });
      if (existing) {
        throw new ConflictException('Already registered');
      }

      const price = parseFloat(event.price) || 0;

      // Ücretli etkinlik → Stripe checkout
      if (price > 0 && this.stripeService.isEnabled) {
        const reg = em.getRepository(ClubEventRegistration).create({
          clubEventId: event.id,
          userId: user.id,
          paymentStatus: 'pending',
          depositAmount: String(price),
        });
        await em.getRepository(ClubEventRegistration).save(reg);

        const checkout = await this.stripeService.createCheckoutSession({
          bookingId: reg.id,
          amount: Math.round(price * 100), // kuruş
          currency: event.currency || 'TRY',
          customerEmail: user.email,
          description: `Etkinlik: ${event.title}`,
          successUrl: `https://www.wellnessclub.tech/booking-success?type=event&id=${reg.id}`,
          cancelUrl: `https://www.wellnessclub.tech/booking-cancel?type=event&id=${reg.id}`,
          metadata: { eventRegistrationId: reg.id },
        });

        if (checkout) {
          return { ok: true as const, paymentRequired: true, checkoutUrl: checkout.url };
        }
        // Stripe disabled fallback
        reg.paymentStatus = 'paid';
        await em.getRepository(ClubEventRegistration).save(reg);
        return { ok: true as const };
      }

      // Ücretsiz etkinlik → direkt kayıt
      await em.getRepository(ClubEventRegistration).insert({
        clubEventId: event.id,
        userId: user.id,
        paymentStatus: 'free',
      });

      // Üyeye push bildirim
      const dateStr = event.startsAt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = event.startsAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      void this.pushService.sendToUser(
        user.id,
        '✅ Etkinlik Kaydınız Onaylandı',
        `${event.title} · ${dateStr} ${timeStr}${event.location ? ` · 📍 ${event.location}` : ''}`,
        { type: 'event_joined', eventId: event.id },
      );

      // Etkinliği oluşturan eğitmene bildirim
      if (event.createdByUserId && event.createdByUserId !== user.id) {
        const memberName = `${user.firstName} ${user.lastName}`.trim();
        void this.pushService.sendToUser(
          event.createdByUserId,
          '👥 Yeni Katılımcı',
          `${memberName} "${event.title}" etkinliğinize katıldı.`,
          { type: 'event_new_participant', eventId: event.id },
        );
      }

      return { ok: true as const };
    });
  }

  async leave(user: User, eventId: string) {
    const now = new Date();
    const event = await this.eventRepo.findOne({
      where: { id: eventId, tenantId: user.tenantId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.startsAt <= now) {
      throw new BadRequestException('Cannot cancel after the event has started');
    }
    const res = await this.regRepo.delete({ clubEventId: eventId, userId: user.id });
    if (!res.affected) {
      throw new NotFoundException('Registration not found');
    }
    return { ok: true as const };
  }

  /** Bekleme listesine katıl */
  async joinWaitlist(user: User, eventId: string) {
    const event = await this.eventRepo.findOne({
      where: { id: eventId, tenantId: user.tenantId, status: 'approved' },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    // Zaten kayıtlı mı?
    const existingReg = await this.regRepo.findOne({
      where: { clubEventId: eventId, userId: user.id },
    });
    if (existingReg) throw new ConflictException('Zaten bu etkinliğe kayıtlısınız');

    // Zaten bekleme listesinde mi?
    const existingWait = await this.waitlistRepo.findOne({
      where: { clubEventId: eventId, userId: user.id },
    });
    if (existingWait) throw new ConflictException('Zaten bekleme listesindesiniz');

    // Kapasite dolu mu kontrol et
    const regCount = await this.regRepo.count({ where: { clubEventId: eventId } });
    if (regCount < event.capacity) {
      throw new BadRequestException('Etkinlikte hâlâ yer var, doğrudan katılabilirsiniz');
    }

    // Sıra numarası bul
    const lastPos = await this.waitlistRepo
      .createQueryBuilder('w')
      .select('MAX(w.position)', 'maxPos')
      .where('w.clubEventId = :eventId', { eventId })
      .getRawOne();
    const position = (lastPos?.maxPos ?? 0) + 1;

    const entry = this.waitlistRepo.create({
      clubEventId: eventId,
      userId: user.id,
      status: 'active',
      position,
    });
    await this.waitlistRepo.save(entry);

    return { ok: true, position };
  }

  /** Etkinliği değerlendir */
  async reviewEvent(user: User, eventId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Puan 1-5 arası olmalı');

    const event = await this.eventRepo.findOne({
      where: { id: eventId, tenantId: user.tenantId },
    });
    if (!event) throw new NotFoundException('Etkinlik bulunamadı');

    // Etkinlik geçmiş mi?
    if (new Date(event.startsAt) > new Date()) {
      throw new BadRequestException('Henüz gerçekleşmemiş etkinliği değerlendiremezsiniz');
    }

    // Katılmış mı?
    const registration = await this.regRepo.findOne({
      where: { clubEventId: eventId, userId: user.id },
    });
    if (!registration) throw new BadRequestException('Bu etkinliğe katılmadınız');

    // Zaten değerlendirme var mı?
    const existing = await this.reviewRepo.findOne({
      where: { clubEventId: eventId, userId: user.id },
    });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment?.trim() || null;
      await this.reviewRepo.save(existing);
      return { ok: true, updated: true };
    }

    const review = this.reviewRepo.create({
      clubEventId: eventId,
      userId: user.id,
      rating,
      comment: comment?.trim() || null,
    });
    await this.reviewRepo.save(review);
    return { ok: true, created: true };
  }
}
