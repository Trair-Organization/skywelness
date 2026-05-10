import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Not, Repository } from 'typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { ReservationStatus, SessionType } from '../database/enums';
import { NotificationDispatcher } from './notification-dispatcher.service';

/**
 * Randevu hatırlatma scheduler'ı.
 *
 * - T-24 saat: Her gün 09:00'da, bir sonraki 24-48 saat arasında olan randevulara SMS+Mail+Push.
 * - T-2 saat: Her 15 dakikada bir, 90-150 dakika sonra olan randevulara Push.
 *
 * Idempotent olması için `notes` alanına etiket basarız (`[R24]`, `[R2]`) — aynı pencereden iki
 * kez gitmez. Düşük maliyetli ve ek tablo gerektirmeyen bir yaklaşım.
 */
@Injectable()
export class ReservationReminderService {
  private readonly logger = new Logger(ReservationReminderService.name);

  constructor(
    @InjectRepository(Reservation) private readonly reservationsRepo: Repository<Reservation>,
    private readonly notifier: NotificationDispatcher,
  ) {}

  /** Her gün 09:00 (Europe/Istanbul). Sabah vardiyası için yeterli bir saat. */
  @Cron('0 9 * * *', { timeZone: 'Europe/Istanbul' })
  async sendDayReminders() {
    // Bugünden itibaren 24-48 saat arası randevular (yani yarın tüm günü kapsar)
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const rows = await this.reservationsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.trainer', 't')
      .leftJoinAndSelect('t.user', 'tu')
      .leftJoinAndSelect('r.spaTherapist', 'st')
      .where('r.status = :status', { status: ReservationStatus.CONFIRMED })
      .andWhere('r.startTime >= :start AND r.startTime < :end', { start, end })
      .andWhere('(r.notes IS NULL OR r.notes NOT LIKE :tag)', { tag: '%[R24]%' })
      .getMany();

    this.logger.log(`[REMINDER] T-24: ${rows.length} randevu bulundu`);

    for (const r of rows) {
      if (!r.user) continue;
      const providerName =
        r.spaTherapist?.name ??
        (r.trainer?.user ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`.trim() : '') ??
        '';
      const sessionType =
        r.sessionType === SessionType.PERSONAL_TRAINING ? 'personal_training' : 'massage';
      const date = r.startTime.toLocaleDateString('tr-TR');
      const time = r.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      try {
        await this.notifier.reservationReminder({
          member: r.user,
          providerName,
          sessionType,
          date,
          time,
          reservationId: r.id,
          window: 'day',
        });
        // Etiketle (idempotency)
        r.notes = `${r.notes || ''} [R24]`.trim();
        await this.reservationsRepo.save(r);
      } catch (e) {
        this.logger.error(`[REMINDER T-24] ${r.id} failed: ${String(e)}`);
      }
    }
  }

  /** Her 15 dakikada bir. 90-150 dakika aralığındaki randevulara T-2 push. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendHourReminders() {
    const now = new Date();
    const start = new Date(now.getTime() + 90 * 60 * 1000);
    const end = new Date(now.getTime() + 150 * 60 * 1000);

    const rows = await this.reservationsRepo.find({
      where: {
        status: ReservationStatus.CONFIRMED,
        startTime: Between(start, end),
        userId: Not(IsNull() as never),
      },
      relations: ['user', 'trainer', 'trainer.user', 'spaTherapist'],
    });

    const eligible = rows.filter((r) => !(r.notes && r.notes.includes('[R2]')));
    if (eligible.length === 0) return;
    this.logger.log(`[REMINDER] T-2: ${eligible.length} randevu bulundu`);

    for (const r of eligible) {
      if (!r.user) continue;
      const providerName =
        r.spaTherapist?.name ??
        (r.trainer?.user ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}`.trim() : '') ??
        '';
      const sessionType =
        r.sessionType === SessionType.PERSONAL_TRAINING ? 'personal_training' : 'massage';
      const date = r.startTime.toLocaleDateString('tr-TR');
      const time = r.startTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      try {
        await this.notifier.reservationReminder({
          member: r.user,
          providerName,
          sessionType,
          date,
          time,
          reservationId: r.id,
          window: 'hour',
        });
        r.notes = `${r.notes || ''} [R2]`.trim();
        await this.reservationsRepo.save(r);
      } catch (e) {
        this.logger.error(`[REMINDER T-2] ${r.id} failed: ${String(e)}`);
      }
    }
  }
}
