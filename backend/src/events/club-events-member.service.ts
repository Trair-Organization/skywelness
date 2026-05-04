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
import type { User } from '../database/entities/user.entity';

export type ClubEventPublicRow = {
  id: string;
  title: string;
  description: string | null;
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
    private readonly dataSource: DataSource,
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
      imageUrl: e.imageUrl,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt ? e.endsAt.toISOString() : null,
      capacity: e.capacity,
      bookedCount: countMap.get(e.id) ?? 0,
      isJoined: joined.has(e.id),
    }));
  }

  async join(user: User, eventId: string) {
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
      await em.getRepository(ClubEventRegistration).insert({
        clubEventId: event.id,
        userId: user.id,
      });
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
}
