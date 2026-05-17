import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { PushService } from '../notifications/push.service';

@Injectable()
export class EventSchedulerService {
  private readonly logger = new Logger(EventSchedulerService.name);

  constructor(
    @InjectRepository(ClubEvent)
    private readonly eventsRepo: Repository<ClubEvent>,
    @InjectRepository(ClubEventRegistration)
    private readonly registrationsRepo: Repository<ClubEventRegistration>,
    private readonly pushService: PushService,
  ) {}

  /**
   * Her 15 dakikada çalışır.
   * Yaklaşan etkinliklere (30-60 dk içinde başlayacak) hatırlatma gönderir.
   */
  @Cron('0 */15 * * * *')
  async sendEventReminders() {
    const now = new Date();
    const in30min = new Date(now.getTime() + 30 * 60 * 1000);
    const in60min = new Date(now.getTime() + 60 * 60 * 1000);

    // 30-60 dakika içinde başlayacak onaylı etkinlikleri bul
    const events = await this.eventsRepo.find({
      where: {
        status: 'approved',
        startsAt: Between(in30min, in60min),
      },
    });

    for (const event of events) {
      // Bu etkinliğe kayıtlı kullanıcıları bul
      const registrations = await this.registrationsRepo.find({
        where: { clubEventId: event.id },
        select: ['userId'],
      });

      if (registrations.length === 0) continue;

      const userIds = registrations.map((r) => r.userId);
      const timeStr = event.startsAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

      const result = await this.pushService.sendToMany(
        userIds,
        '⏰ Etkinlik Hatırlatma',
        `"${event.title}" bugün saat ${timeStr}'de başlıyor! Hazır mısınız?`,
        { type: 'event_reminder', eventId: event.id },
      );

      this.logger.log(
        `Reminder sent for "${event.title}": ${result.sent}/${result.total} users`,
      );
    }
  }
}
