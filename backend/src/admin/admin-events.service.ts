import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { CreateClubEventDto } from './dto/create-club-event.dto';
import { UpdateClubEventDto } from './dto/update-club-event.dto';
import { PushService } from '../notifications/push.service';

@Injectable()
export class AdminEventsService {
  constructor(
    @InjectRepository(ClubEvent)
    private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly registrationsRepo: Repository<ClubEventRegistration>,
    private readonly pushService: PushService,
  ) {}

  async list(tenantId: string) {
    return this.eventsRepo.find({
      where: { tenantId },
      order: { startsAt: 'DESC' },
      take: 200,
    });
  }

  async create(tenantId: string, dto: CreateClubEventDto, createdByUserId?: string) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException('Event end time must be later than start time');
    }
    const row = this.eventsRepo.create({
      tenantId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      coachName: dto.coachName?.trim() || null,
      location: dto.location.trim(),
      imageUrl: dto.imageUrl?.trim() || null,
      startsAt,
      endsAt,
      capacity: dto.capacity ?? 30,
      category: dto.category?.trim() || 'general',
      requirements: dto.requirements?.trim() || null,
      schedule: dto.schedule ?? null,
      price: dto.price != null ? String(dto.price) : '0',
      published: false,
      status: 'pending_approval',
      createdByUserId: createdByUserId || null,
    });
    const saved = await this.eventsRepo.save(row);

    // Recurring: oluştur
    if (dto.recurringRule) {
      await this.generateRecurringEvents(saved, dto.recurringRule);
    }

    return saved;
  }

  /** Tekrarlayan etkinlikleri oluştur */
  private async generateRecurringEvents(
    parent: ClubEvent,
    rule: { frequency: string; daysOfWeek?: number[]; endDate?: string; interval?: number },
  ) {
    const endDate = rule.endDate ? new Date(rule.endDate) : new Date(parent.startsAt.getTime() + 90 * 24 * 60 * 60 * 1000);
    const interval = rule.interval || 1;
    const duration = parent.endsAt ? parent.endsAt.getTime() - parent.startsAt.getTime() : 0;

    const events: Partial<ClubEvent>[] = [];
    let current = new Date(parent.startsAt);

    for (let i = 0; i < 52 && events.length < 52; i++) {
      // İlerle
      if (rule.frequency === 'daily') {
        current = new Date(current.getTime() + interval * 24 * 60 * 60 * 1000);
      } else if (rule.frequency === 'weekly') {
        current = new Date(current.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
      } else if (rule.frequency === 'monthly') {
        current = new Date(current);
        current.setMonth(current.getMonth() + interval);
      }

      if (current > endDate) break;

      // daysOfWeek filtresi (0=Pazar, 1=Pazartesi...)
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        if (!rule.daysOfWeek.includes(current.getDay())) continue;
      }

      events.push({
        tenantId: parent.tenantId,
        title: parent.title,
        description: parent.description,
        coachName: parent.coachName,
        location: parent.location,
        imageUrl: parent.imageUrl,
        startsAt: new Date(current),
        endsAt: duration ? new Date(current.getTime() + duration) : null,
        capacity: parent.capacity,
        category: parent.category,
        requirements: parent.requirements,
        schedule: parent.schedule,
        price: parent.price,
        published: false,
        status: 'pending_approval',
        parentEventId: parent.id,
      });
    }

    if (events.length > 0) {
      await this.eventsRepo.save(events as ClubEvent[]);
    }

    // Parent'a recurring rule kaydet
    parent.recurringRule = rule as ClubEvent['recurringRule'];
    await this.eventsRepo.save(parent);
  }

  async update(tenantId: string, id: string, dto: UpdateClubEventDto) {
    const row = await this.eventsRepo.findOne({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException('Event not found');
    }
    if (dto.title !== undefined) {
      row.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      row.description = dto.description === null ? null : dto.description.trim() || null;
    }
    if (dto.coachName !== undefined) {
      row.coachName = dto.coachName === null ? null : dto.coachName.trim() || null;
    }
    if (dto.location !== undefined) {
      row.location = dto.location === null ? null : dto.location.trim() || null;
    }
    if (dto.imageUrl !== undefined) {
      row.imageUrl = dto.imageUrl === null ? null : dto.imageUrl.trim() || null;
    }
    if (dto.startsAt !== undefined) {
      row.startsAt = new Date(dto.startsAt);
    }
    if (dto.endsAt !== undefined) {
      row.endsAt = dto.endsAt === null ? null : new Date(dto.endsAt);
    }
    if (row.endsAt && row.endsAt <= row.startsAt) {
      throw new BadRequestException('Event end time must be later than start time');
    }
    if (dto.capacity !== undefined) {
      row.capacity = dto.capacity;
    }
    if (dto.published !== undefined) {
      row.published = dto.published;
    }
    if (dto.price !== undefined) {
      row.price = String(dto.price);
    }
    if (dto.requirements !== undefined) {
      row.requirements = dto.requirements === null ? null : dto.requirements.trim() || null;
    }
    if (dto.category !== undefined) {
      row.category = dto.category?.trim() || 'general';
    }
    return this.eventsRepo.save(row);
  }

  async remove(tenantId: string, id: string) {
    const res = await this.eventsRepo.delete({ id, tenantId });
    if (!res.affected) {
      throw new NotFoundException('Event not found');
    }
    return { ok: true as const };
  }

  /** Etkinlik katılımcı listesi */
  async listParticipants(tenantId: string, eventId: string) {
    const event = await this.eventsRepo.findOne({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Event not found');

    const registrations = await this.registrationsRepo.find({
      where: { clubEventId: eventId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      capacity: event.capacity,
      participantCount: registrations.length,
      participants: registrations.map((r) => ({
        id: r.id,
        userId: r.userId,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        email: r.user.email,
        phone: r.user.phone,
        registeredAt: r.createdAt,
      })),
    };
  }

  /** Etkinlik kopyala (yeni tarihle) */
  async duplicate(tenantId: string, eventId: string, newDate?: string) {
    const source = await this.eventsRepo.findOne({ where: { id: eventId, tenantId } });
    if (!source) throw new NotFoundException('Event not found');

    const startsAt = newDate
      ? new Date(`${newDate}T${source.startsAt.toTimeString().slice(0, 5)}:00`)
      : new Date(source.startsAt.getTime() + 7 * 24 * 60 * 60 * 1000); // +1 hafta

    let endsAt: Date | null = null;
    if (source.endsAt) {
      const diff = source.endsAt.getTime() - source.startsAt.getTime();
      endsAt = new Date(startsAt.getTime() + diff);
    }

    const row = this.eventsRepo.create({
      tenantId,
      title: source.title,
      description: source.description,
      coachName: source.coachName,
      location: source.location,
      imageUrl: source.imageUrl,
      startsAt,
      endsAt,
      capacity: source.capacity,
      category: source.category,
      requirements: source.requirements,
      schedule: source.schedule,
      price: source.price,
      published: false, // Kopyalar taslak olarak başlar
    });
    return this.eventsRepo.save(row);
  }

  /** Katılımcılara push bildirim gönder */
  async notifyParticipants(tenantId: string, eventId: string, title: string, message: string) {
    const event = await this.eventsRepo.findOne({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Event not found');

    const registrations = await this.registrationsRepo.find({
      where: { clubEventId: eventId },
      select: ['userId'],
    });

    if (registrations.length === 0) return { sent: 0, total: 0 };

    const userIds = registrations.map((r) => r.userId);
    const result = await this.pushService.sendToMany(userIds, title, message, {
      type: 'event_notification',
      eventId,
    });
    return result;
  }

  /** Check-in: Katılımcıyı giriş yaptı olarak işaretle */
  async checkInParticipant(tenantId: string, eventId: string, registrationId: string) {
    const event = await this.eventsRepo.findOne({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Event not found');

    const registration = await this.registrationsRepo.findOne({
      where: { id: registrationId, clubEventId: eventId },
    });
    if (!registration) throw new NotFoundException('Registration not found');

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    await this.registrationsRepo.save(registration);

    return { ok: true, checkedIn: true, checkedInAt: registration.checkedInAt };
  }
}
