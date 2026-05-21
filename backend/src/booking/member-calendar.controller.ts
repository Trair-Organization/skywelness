import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberCalendarEntry } from '../database/entities/member-calendar-entry.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { User } from '../database/entities/user.entity';
import { UserRole, ReservationStatus } from '../database/enums';

/**
 * Üye Ajandası — kişisel plan + platform verileri birleşik takvim.
 */
@Controller('member/calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER)
export class MemberCalendarController {
  constructor(
    @InjectRepository(MemberCalendarEntry)
    private readonly entriesRepo: Repository<MemberCalendarEntry>,
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
    @InjectRepository(ClubEventRegistration)
    private readonly eventRegRepo: Repository<ClubEventRegistration>,
  ) {}

  /**
   * Belirli tarih aralığındaki tüm takvim verilerini birleşik döndür.
   * Platform + kişisel entries → tek array.
   */
  @Get()
  async getCalendar(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from || new Date().toISOString().slice(0, 10);
    const toDate = to || fromDate;

    const fromDT = new Date(`${fromDate}T00:00:00Z`);
    const toDT = new Date(`${toDate}T23:59:59Z`);

    // 1) Kişisel entries
    const personal = await this.entriesRepo.find({
      where: { userId: user.id, date: Between(fromDate, toDate) },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    // 2) PT/Masaj dersleri (reservation)
    const reservations = await this.reservationsRepo.find({
      where: {
        userId: user.id,
        startTime: Between(fromDT, toDT),
        status: ReservationStatus.CONFIRMED,
      },
      relations: ['trainer', 'trainer.user'],
      order: { startTime: 'ASC' },
    });

    // 3) Katıldığı etkinlikler
    const eventRegs = await this.eventRegRepo.find({
      where: { userId: user.id },
      relations: ['event'],
    });
    const eventEntries = eventRegs
      .filter((r) => {
        if (!r.event) return false;
        const eventDate = r.event.startsAt.toISOString().slice(0, 10);
        return eventDate >= fromDate && eventDate <= toDate;
      })
      .sort((a, b) => a.event.startsAt.getTime() - b.event.startsAt.getTime());

    // Birleşik array
    const items: Array<{
      id: string;
      type: 'personal' | 'lesson' | 'event';
      title: string;
      description: string | null;
      date: string;
      startTime: string | null;
      endTime: string | null;
      category: string;
      color: string;
      completed: boolean;
      meta?: Record<string, unknown>;
    }> = [];

    // Kişisel
    for (const e of personal) {
      items.push({
        id: e.id,
        type: 'personal',
        title: e.title,
        description: e.description,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        category: e.category,
        color: e.color,
        completed: e.completed,
      });
    }

    // Dersler
    for (const r of reservations) {
      const trainerName = r.trainer?.user
        ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`.trim()
        : 'PT';
      items.push({
        id: r.id,
        type: 'lesson',
        title: `${r.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'} — ${trainerName}`,
        description: r.notes,
        date: r.startTime.toISOString().slice(0, 10),
        startTime: r.startTime.toISOString().slice(11, 16),
        endTime: r.endTime.toISOString().slice(11, 16),
        category: r.sessionType === 'personal_training' ? 'workout' : 'wellness',
        color: '#2563eb',
        completed: r.status === ('completed' as never),
        meta: { trainerId: r.trainerId, reservationId: r.id },
      });
    }

    // Etkinlikler
    for (const reg of eventEntries) {
      const ev = reg.event;
      items.push({
        id: reg.id,
        type: 'event',
        title: `📅 ${ev.title}`,
        description: ev.description,
        date: ev.startsAt.toISOString().slice(0, 10),
        startTime: ev.startsAt.toISOString().slice(11, 16),
        endTime: ev.endsAt ? ev.endsAt.toISOString().slice(11, 16) : null,
        category: 'event',
        color: '#059669',
        completed: false,
        meta: { eventId: ev.id, location: ev.location },
      });
    }

    // Tarihe göre sırala
    items.sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return items;
  }

  /** Kişisel takvim kaydı oluştur */
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body()
    body: {
      title: string;
      description?: string;
      date: string;
      startTime?: string;
      endTime?: string;
      category?: string;
      color?: string;
      recurringRule?: { frequency: 'daily' | 'weekly' | 'monthly'; endDate?: string };
    },
  ) {
    const entry = this.entriesRepo.create({
      userId: user.id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      date: body.date,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      category: body.category || 'personal',
      color: body.color || '#f59e0b',
      recurringRule: body.recurringRule || null,
    });
    const saved = await this.entriesRepo.save(entry);
    return saved;
  }

  /** Kişisel takvim kaydı güncelle */
  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      date?: string;
      startTime?: string | null;
      endTime?: string | null;
      category?: string;
      color?: string;
      completed?: boolean;
    },
  ) {
    const entry = await this.entriesRepo.findOne({ where: { id, userId: user.id } });
    if (!entry) return { error: 'Not found' };

    if (body.title !== undefined) entry.title = body.title.trim();
    if (body.description !== undefined) entry.description = body.description?.trim() || null;
    if (body.date !== undefined) entry.date = body.date;
    if (body.startTime !== undefined) entry.startTime = body.startTime;
    if (body.endTime !== undefined) entry.endTime = body.endTime;
    if (body.category !== undefined) entry.category = body.category;
    if (body.color !== undefined) entry.color = body.color;
    if (body.completed !== undefined) entry.completed = body.completed;

    await this.entriesRepo.save(entry);
    return entry;
  }

  /** Kişisel takvim kaydı sil */
  @Delete(':id')
  async remove(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const res = await this.entriesRepo.delete({ id, userId: user.id });
    return { ok: !!res.affected };
  }

  /** Tamamlandı toggle */
  @Patch(':id/toggle')
  async toggle(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const entry = await this.entriesRepo.findOne({ where: { id, userId: user.id } });
    if (!entry) return { error: 'Not found' };
    entry.completed = !entry.completed;
    await this.entriesRepo.save(entry);
    return { ok: true, completed: entry.completed };
  }
}
