import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { User } from '../database/entities/user.entity';
import { PushService } from '../notifications/push.service';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly pushService: PushService,
  ) {}

  /** Participant ID'lerini sıralı tut (tutarlılık için). */
  private sortParticipants(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  /** Kullanıcının tüm sohbetlerini listele. */
  async listConversations(userId: string) {
    const conversations = await this.convRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.participantA', 'a')
      .leftJoinAndSelect('c.participantB', 'b')
      .where('c.participant_a_id = :userId OR c.participant_b_id = :userId', { userId })
      .orderBy('c.last_message_at', 'DESC', 'NULLS LAST')
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
      })
      .where('id = :id', { id: conversationId });

    if (isA) {
      updateQb.set({
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
        unreadCountB: () => '"unread_count_b" + 1',
      });
    } else {
      updateQb.set({
        lastMessagePreview: preview,
        lastMessageAt: new Date(),
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
