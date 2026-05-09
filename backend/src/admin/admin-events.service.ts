import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { CreateClubEventDto } from './dto/create-club-event.dto';
import { UpdateClubEventDto } from './dto/update-club-event.dto';

@Injectable()
export class AdminEventsService {
  constructor(
    @InjectRepository(ClubEvent)
    private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly registrationsRepo: Repository<ClubEventRegistration>,
  ) {}

  async list(tenantId: string) {
    return this.eventsRepo.find({
      where: { tenantId },
      order: { startsAt: 'DESC' },
      take: 200,
    });
  }

  async create(tenantId: string, dto: CreateClubEventDto) {
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
      published: dto.published ?? true,
    });
    return this.eventsRepo.save(row);
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
}
