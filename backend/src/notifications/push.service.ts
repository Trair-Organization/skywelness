import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /** Expo Push Notification gönder (tek kullanıcı). */
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
      const token = this.extractPushToken(user);
      if (!token) return;
      await this.sendExpoPush([{ to: token, title, body, data }]);
    } catch (err) {
      this.logger.warn(
        `Push error for user ${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Toplu push bildirim gönder (birden fazla kullanıcı).
   * Returns: kaç kişiye gönderildi.
   */
  async sendToMany(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
    imageUrl?: string | null,
  ): Promise<{ sent: number; total: number }> {
    if (userIds.length === 0) return { sent: 0, total: 0 };

    const users = await this.usersRepo.find({
      where: { id: In(userIds) },
      select: ['id', 'notificationPreferences'],
    });

    const messages = users
      .map((u) => {
        const token = this.extractPushToken(u);
        if (!token) return null;
        return {
          to: token,
          title,
          body,
          sound: 'default' as const,
          data: { ...data, imageUrl: imageUrl ?? undefined },
        };
      })
      .filter(Boolean) as Array<{
      to: string;
      title: string;
      body: string;
      sound: 'default';
      data: Record<string, unknown>;
    }>;

    if (messages.length === 0) return { sent: 0, total: userIds.length };

    await this.sendExpoPush(messages);
    this.logger.log(`Bulk push sent: ${messages.length}/${userIds.length} users`);
    return { sent: messages.length, total: userIds.length };
  }

  /**
   * Tenant'ın tüm üyelerine push gönder.
   */
  async sendToTenantMembers(
    tenantId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    imageUrl?: string | null,
    targetRole?: 'member' | 'trainer' | 'all',
  ): Promise<{ sent: number; total: number }> {
    const where: Record<string, unknown> = { tenantId };
    if (targetRole === 'member') where.role = 'member';
    else if (targetRole === 'trainer') where.role = In(['trainer', 'independent_trainer']);
    // 'all' → no role filter

    const users = await this.usersRepo.find({
      where: where as never,
      select: ['id', 'notificationPreferences'],
    });

    const messages = users
      .map((u) => {
        const token = this.extractPushToken(u);
        if (!token) return null;
        return { to: token, title, body, sound: 'default' as const, data: { ...data, imageUrl: imageUrl ?? undefined } };
      })
      .filter(Boolean) as Array<{ to: string; title: string; body: string; sound: 'default'; data: Record<string, unknown> }>;

    if (messages.length === 0) return { sent: 0, total: users.length };
    await this.sendExpoPush(messages);
    this.logger.log(`Tenant push sent: ${messages.length}/${users.length} (tenant=${tenantId})`);
    return { sent: messages.length, total: users.length };
  }

  private extractPushToken(user: { notificationPreferences?: Record<string, unknown> | null } | null): string | null {
    const rawToken =
      user?.notificationPreferences &&
      typeof user.notificationPreferences === 'object' &&
      'expoPushToken' in user.notificationPreferences
        ? user.notificationPreferences.expoPushToken
        : null;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token || !token.startsWith('ExponentPushToken[')) return null;
    return token;
  }

  private async sendExpoPush(
    messages: Array<{ to: string; title: string; body: string; sound?: string; data?: Record<string, unknown> }>,
  ): Promise<void> {
    // Expo batch limit: 100 per request
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) {
          this.logger.warn(`Expo push batch failed: ${res.status}`);
        }
      } catch (err) {
        this.logger.error(`Expo push batch error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
