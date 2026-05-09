import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /** Expo Push Notification gönder. */
  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const user = await this.usersRepo.findOne({
        where: { id: userId },
        select: ['id', 'notificationPreferences'],
      });
      const rawToken =
        user?.notificationPreferences &&
        typeof user.notificationPreferences === 'object' &&
        'expoPushToken' in user.notificationPreferences
          ? user.notificationPreferences.expoPushToken
          : null;
      const token = typeof rawToken === 'string' ? rawToken.trim() : '';
      if (!token || !token.startsWith('ExponentPushToken[')) {
        return;
      }
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token,
          title,
          body,
          sound: 'default',
          data: data ?? {},
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Push failed for user ${userId}: ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(
        `Push error for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
