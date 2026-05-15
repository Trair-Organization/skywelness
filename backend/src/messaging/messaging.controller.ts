import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagingService } from './messaging.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /** Kullanıcının tüm sohbetleri. */
  @Get('conversations')
  listConversations(@CurrentUser() user: User) {
    return this.messagingService.listConversations(user.id);
  }

  /** Toplam okunmamış mesaj sayısı (badge). */
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.messagingService.getUnreadCount(user.id);
  }

  /** Sohbet başlat veya mevcut olanı getir. */
  @Post('conversations')
  startConversation(@CurrentUser() user: User, @Body() body: { otherUserId: string }) {
    return this.messagingService.getOrCreateConversation(user.id, body.otherUserId);
  }

  /** Kulübe mesaj gönder (kendi kulübünün admin'i ile). */
  @Post('conversations/club')
  startClubConversation(@CurrentUser() user: User) {
    return this.messagingService.getOrCreateConversationWithClubByTenantId(user.id, user.tenantId);
  }

  /** Cross-tenant: Başka kulübe mesaj başlat. */
  @Post('conversations/club-by-subdomain')
  startCrossTenantClubConversation(@CurrentUser() user: User, @Body() body: { subdomain: string }) {
    return this.messagingService.getOrCreateConversationWithClubBySubdomain(
      user.id,
      body.subdomain,
    );
  }

  // ═══ MODERATION (App Store 1.2 — User-Generated Content) ═══

  /** Sohbeti kullanıcının kendi tarafından sil (soft delete). */
  @Delete('conversations/:conversationId')
  deleteConversation(@CurrentUser() user: User, @Param('conversationId') conversationId: string) {
    return this.messagingService.deleteConversation(user.id, conversationId);
  }

  /** Tek mesaj sil (sadece kendi gönderdiği mesajı). */
  @Delete('messages/:messageId')
  deleteMessage(@CurrentUser() user: User, @Param('messageId') messageId: string) {
    return this.messagingService.deleteMessage(user.id, messageId);
  }

  /** Kullanıcıyı engelle. */
  @Post('users/:userId/block')
  blockUser(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.messagingService.blockUser(user.id, userId, body.reason);
  }

  /** Engeli kaldır. */
  @Delete('users/:userId/block')
  unblockUser(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.messagingService.unblockUser(user.id, userId);
  }

  /** Engellenen kullanıcılar listesi. */
  @Get('users/blocked')
  listBlocked(@CurrentUser() user: User) {
    return this.messagingService.listBlockedUsers(user.id);
  }

  /** Kullanıcı veya mesaj şikayet et. */
  @Post('reports')
  reportUser(
    @CurrentUser() user: User,
    @Body()
    body: {
      reportedUserId: string;
      conversationId?: string;
      messageId?: string;
      category: 'spam' | 'harassment' | 'inappropriate' | 'fake_profile' | 'violence' | 'other';
      description?: string;
    },
  ) {
    return this.messagingService.reportUser(user.id, body);
  }

  // ═══ MESSAGES ═══════════════════════════════════════════

  /** Mesaj gönder. */
  @Post('conversations/:conversationId')
  sendMessage(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string; messageType?: 'text' | 'image' },
  ) {
    return this.messagingService.sendMessage(
      user.id,
      conversationId,
      body.content,
      body.messageType,
    );
  }

  /** Sohbet mesaj geçmişi. */
  @Get('conversations/:conversationId')
  getMessages(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.messagingService.getMessages(user.id, conversationId, Number(limit) || 50, before);
  }
}
