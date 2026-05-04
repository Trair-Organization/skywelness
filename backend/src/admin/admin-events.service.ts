import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubEvent } from '../database/entities/club-event.entity';
import { CreateClubEventDto } from './dto/create-club-event.dto';
import { UpdateClubEventDto } from './dto/update-club-event.dto';

@Injectable()
export class AdminEventsService {
  constructor(
    @InjectRepository(ClubEvent)
    private readonly eventsRepo: Repository<ClubEvent>,
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
    const row = this.eventsRepo.create({
      tenantId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      imageUrl: dto.imageUrl?.trim() || null,
      startsAt,
      endsAt,
      capacity: dto.capacity ?? 30,
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
    if (dto.imageUrl !== undefined) {
      row.imageUrl = dto.imageUrl === null ? null : dto.imageUrl.trim() || null;
    }
    if (dto.startsAt !== undefined) {
      row.startsAt = new Date(dto.startsAt);
    }
    if (dto.endsAt !== undefined) {
      row.endsAt = dto.endsAt === null ? null : new Date(dto.endsAt);
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
}
