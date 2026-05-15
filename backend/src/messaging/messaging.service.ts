import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { User } from '../database/entities/user.entity';
import { UserBlock } from '../database/entities/user-block.entity';
import { MessageReport, ReportCategory } from '../database/entities/message-report.entity';
import { PushService } from '../notifications/push.service';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserBlock) private readonly userBlockRepo: Repository<UserBlock>,
    @InjectRepository(MessageReport) private readonly reportRepo: Repository<MessageReport>,
    private readonly pushService: PushService,
  ) {}

  /** Participant ID'lerini sıralı tut (tutarlılık için). */
  private sortParticipants(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  /** Kullanıcının tüm sohbetlerini listele (engelli kullanıcılar + silinmiş sohbetler hariç). */
  async listConversations(userId: string) {
    // Engellenenler — bu kullanıcıların sohbetlerini gizle
    const blockedRows = await this.userBlockRepo.find({
      where: { blockerUserId: userId },
      select: ['blockedUserId'],
    });
    const blockedIds = blockedRows.map((b) => b.blockedUserId);

    const qb = this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.participantA', 'a')
      .leftJoinAndSelect('c.participantB', 'b')
      .where('c.participantAId = :userId OR c.participantBId = :userId', { userId })
      // Soft-delete: kullanıcı kendi tarafından silmişse listeden çıkar
      .andWhere(
        '(c.participantAId = :userId AND c.deletedByA = false) OR (c.participantBId = :userId AND c.deletedByB = false)',
        { userId },
      );

    if (blockedIds.length > 0) {
      qb.andWhere('c.participantAId NOT IN (:...blockedIds)', { blockedIds }).andWhere(
        'c.participantBId NOT IN (:...blockedIds)',
        { blockedIds },
      );
    }

    const conversations = await qb
      .orderBy('c.lastMessageAt', 'DESC', 'NULLS LAST')
      .take(50)
      .getMany();

    return conversations.map((c) => {
      const isA = c.participantAId === userId;
      const other = isA ? c.participantB : c.participantA;
      const unreadCount = isA ? c.unreadCountA : c.unreadCountB;
      return {
        id: c.id,
        otherUser: {
          id: other.id,
          firstName: other.firstName,
          lastName: other.lastName,
          photoUrl: other.photoUrl,
          role: other.role,
        },
        lastMessagePreview: c.lastMessagePreview,
        lastMessageAt: c.lastMessageAt,
        lastMessageSenderId: c.lastMessageSenderId,
        isLastMessageMine: c.lastMessageSenderId === userId,
        unreadCount,
      };
    });
  }

  /** Sohbet başlat veya mevcut olanı getir. */
  async getOrCreateConversation(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new BadRequestException('Cannot message yourself');
    }
    const other = await this.usersRepo.findOne({ where: { id: otherUserId } });
    if (!other) {
      throw new NotFoundException('User not found');
    }

    const [aId, bId] = this.sortParticipants(userId, otherUserId);
    let conversation = await this.convRepo.findOne({
      where: { participantAId: aId, participantBId: bId },
    });

    if (!conversation) {
      conversation = this.convRepo.create({
        participantAId: aId,
        participantBId: bId,
      });
      await this.convRepo.save(conversation);
    }

    return { conversationId: conversation.id };
  }

  /** Kulübe mesaj: Tenant'ın admin kullanıcısını bulup sohbet başlat. */
  async getOrCreateConversationWithClub(userId: string, tenantSubdomain: string) {
    const admin = await this.usersRepo.findOne({
      where: { tenant: { subdomain: tenantSubdomain }, role: 'administrator' as never },
      relations: ['tenant'],
    });
    if (!admin) {
      throw new NotFoundException('Club admin not found');
    }
    return this.getOrCreateConversation(userId, admin.id);
  }

  /** Kulübe mesaj: TenantId ile admin kullanıcısını bulup sohbet başlat. */
  async getOrCreateConversationWithClubByTenantId(userId: string, tenantId: string) {
    const admin = await this.usersRepo.findOne({
      where: { tenantId, role: 'administrator' as never },
    });
    if (!admin) {
      throw new NotFoundException('Club admin not found');
    }
    return this.getOrCreateConversation(userId, admin.id);
  }

  /** Cross-tenant: Subdomain ile kulüp adminini bulup sohbet başlat. */
  async getOrCreateConversationWithClubBySubdomain(userId: string, subdomain: string) {
    return this.getOrCreateConversationWithClub(userId, subdomain);
  }

  // ═══════════════════════════════════════════════════════════
  // MODERATION (App Store 1.2 — User-Generated Content)
  // ═══════════════════════════════════════════════════════════

  /** Sohbeti kullanıcı için soft-delete (kendi tarafından gizler). */
  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    if (conversation.participantAId === userId) {
      await this.convRepo.update({ id: conversationId }, { deletedByA: true });
    } else if (conversation.participantBId === userId) {
      await this.convRepo.update({ id: conversationId }, { deletedByB: true });
    } else {
      throw new ForbiddenException('Not a participant');
    }

    return { ok: true };
  }

  /** Kullanıcıyı engelle. */
  async blockUser(blockerUserId: string, blockedUserId: string, reason?: string) {
    if (blockerUserId === blockedUserId) {
      throw new BadRequestException('Cannot block yourself');
    }
    const target = await this.usersRepo.findOne({ where: { id: blockedUserId } });
    if (!target) throw new NotFoundException('User not found');

    const existing = await this.userBlockRepo.findOne({
      where: { blockerUserId, blockedUserId },
    });
    if (existing) {
      return { ok: true, alreadyBlocked: true };
    }

    await this.userBlockRepo.save(
      this.userBlockRepo.create({
        blockerUserId,
        blockedUserId,
        reason: reason?.trim() || null,
      }),
    );
    return { ok: true };
  }

  /** Engeli kaldır. */
  async unblockUser(blockerUserId: string, blockedUserId: string) {
    const result = await this.userBlockRepo.delete({ blockerUserId, blockedUserId });
    if (!result.affected) {
      throw new NotFoundException('Block not found');
    }
    return { ok: true };
  }

  /** Engelli kullanıcıları listele. */
  async listBlockedUsers(userId: string) {
    const blocks = await this.userBlockRepo.find({
      where: { blockerUserId: userId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });

    return blocks.map((b) => ({
      id: b.id,
      blockedAt: b.createdAt,
      reason: b.reason,
      user: b.blocked
        ? {
            id: b.blocked.id,
            firstName: b.blocked.firstName,
            lastName: b.blocked.lastName,
            photoUrl: b.blocked.photoUrl,
            role: b.blocked.role,
          }
        : null,
    }));
  }

  /** Kullanıcı veya mesaj şikayeti oluştur. */
  async reportUser(
    reporterUserId: string,
    data: {
      reportedUserId: string;
      conversationId?: string;
      messageId?: string;
      category: ReportCategory;
      description?: string;
    },
  ) {
    if (reporterUserId === data.reportedUserId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const target = await this.usersRepo.findOne({ where: { id: data.reportedUserId } });
    if (!target) throw new NotFoundException('Reported user not found');

    const validCategories: ReportCategory[] = [
      'spam',
      'harassment',
      'inappropriate',
      'fake_profile',
      'violence',
      'other',
    ];
    if (!validCategories.includes(data.category)) {
      throw new BadRequestException('Invalid category');
    }

    const report = this.reportRepo.create({
      reporterUserId,
      reportedUserId: data.reportedUserId,
      conversationId: data.conversationId ?? null,
      messageId: data.messageId ?? null,
      category: data.category,
      description: data.description?.trim() || null,
      status: 'pending',
    });
    await this.reportRepo.save(report);

    return { ok: true, reportId: report.id };
  }

  /** Tek mesajı sil — sadece gönderen kendi mesajını silebilir. */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('Cannot delete others messages');
    }
    await this.msgRepo.delete({ id: messageId });
    return { ok: true };
  }

  /** Mesaj gönder. */
  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    messageType: 'text' | 'image' = 'text',
  ) {
    const conversation = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Kullanıcı bu sohbetin bir parçası mı?
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new BadRequestException('Not a participant of this conversation');
    }

    // Engelleme kontrolü: ya gönderen alıcıyı engellemiş, ya da alıcı göndereni engellemiş
    const otherUserId =
      conversation.participantAId === userId
        ? conversation.participantBId
        : conversation.participantAId;
    const blockExists = await this.userBlockRepo.findOne({
      where: [
        { blockerUserId: userId, blockedUserId: otherUserId },
        { blockerUserId: otherUserId, blockedUserId: userId },
      ],
    });
    if (blockExists) {
      throw new ForbiddenException('Bu kullanıcıyla mesajlaşamazsınız');
    }

    // Karşı taraf sohbeti silmişse, geri aç (yeni mesaj gelince yeniden görünür)
    if (conversation.participantAId === userId && conversation.deletedByB) {
      await this.convRepo.update({ id: conversationId }, { deletedByB: false });
    } else if (conversation.participantBId === userId && conversation.deletedByA) {
      await this.convRepo.update({ id: conversationId }, { deletedByA: false });
    }
    // Gönderen sildiyse de kendi tarafında geri aç
    if (conversation.participantAId === userId && conversation.deletedByA) {
      await this.convRepo.update({ id: conversationId }, { deletedByA: false });
    } else if (conversation.participantBId === userId && conversation.deletedByB) {
      await this.convRepo.update({ id: conversationId }, { deletedByB: false });
    }

    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    const message = this.msgRepo.create({
      conversationId,
      senderId: userId,
      content: trimmed,
      messageType,
    });
    await this.msgRepo.save(message);

    // Conversation meta güncelle
    const preview = trimmed.length > 100 ? trimmed.slice(0, 100) + '…' : trimmed;
    const isA = conversation.participantAId === userId;

    const updateQb = this.convRepo
      .createQueryBuilder()
      .update(Conversation)
      .set({
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
        lastMessageSenderId: userId,
      })
      .where('id = :id', { id: conversationId });

    if (isA) {
      updateQb.set({
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
        lastMessageSenderId: userId,
        unreadCountB: () => '"unread_count_b" + 1',
      });
    } else {
      updateQb.set({
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
        lastMessageSenderId: userId,
        unreadCountA: () => '"unread_count_a" + 1',
      });
    }
    await updateQb.execute();

    // Push notification gönder (karşı tarafa)
    const recipientId = isA ? conversation.participantBId : conversation.participantAId;
    const sender = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['firstName', 'lastName'],
    });
    const senderName = sender ? `${sender.firstName} ${sender.lastName}`.trim() : 'Birisi';
    void this.pushService.sendToUser(recipientId, `💬 ${senderName}`, preview, {
      type: 'message',
      conversationId,
    });

    return {
      id: message.id,
      conversationId,
      senderId: userId,
      content: message.content,
      messageType: message.messageType,
      createdAt: message.createdAt,
    };
  }

  /** Sohbet mesaj geçmişi. */
  async getMessages(userId: string, conversationId: string, limit = 50, before?: string) {
    const conversation = await this.convRepo.findOne({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.participantAId !== userId && conversation.participantBId !== userId) {
      throw new BadRequestException('Not a participant');
    }

    const qb = this.msgRepo
      .createQueryBuilder('m')
      .where('m.conversation_id = :conversationId', { conversationId })
      .orderBy('m.created_at', 'DESC')
      .take(Math.min(limit, 100));

    if (before) {
      qb.andWhere('m.created_at < :before', { before: new Date(before) });
    }

    const messages = await qb.getMany();

    // Okundu olarak işaretle (karşı tarafın mesajlarını)
    const isA = conversation.participantAId === userId;
    if (isA && conversation.unreadCountA > 0) {
      await this.convRepo.update({ id: conversationId }, { unreadCountA: 0 });
      await this.msgRepo
        .createQueryBuilder()
        .update()
        .set({ isRead: true })
        .where('conversation_id = :conversationId AND sender_id != :userId AND is_read = false', {
          conversationId,
          userId,
        })
        .execute();
    } else if (!isA && conversation.unreadCountB > 0) {
      await this.convRepo.update({ id: conversationId }, { unreadCountB: 0 });
      await this.msgRepo
        .createQueryBuilder()
        .update()
        .set({ isRead: true })
        .where('conversation_id = :conversationId AND sender_id != :userId AND is_read = false', {
          conversationId,
          userId,
        })
        .execute();
    }

    return messages.reverse().map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      messageType: m.messageType,
      isRead: m.isRead,
      createdAt: m.createdAt,
      isOwn: m.senderId === userId,
    }));
  }

  /** Toplam okunmamış mesaj sayısı (badge için). */
  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.convRepo
      .createQueryBuilder('c')
      .where('c.participant_a_id = :userId OR c.participant_b_id = :userId', { userId })
      .getMany();

    return conversations.reduce((sum, c) => {
      const isA = c.participantAId === userId;
      return sum + (isA ? c.unreadCountA : c.unreadCountB);
    }, 0);
  }
}
