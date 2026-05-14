import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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

  /** Kulübe mesaj gönder (tenant admin ile sohbet başlat). */
  @Post('conversations/club')
  startClubConversation(@CurrentUser() user: User) {
    return this.messagingService.getOrCreateConversationWithClubByTenantId(user.id, user.tenantId);
  }

  /**
   * Cross-tenant mesajlaşma: Başka kulübe mesaj başlat.
   * Üye kendi kulübüne bağlı olsa bile, ekosistemdeki başka kulüple iletişim kurabilir.
   */
  @Post('conversations/club-by-subdomain')
  startCrossTenantClubConversation(@CurrentUser() user: User, @Body() body: { subdomain: string }) {
    return this.messagingService.getOrCreateConversationWithClubBySubdomain(
      user.id,
      body.subdomain,
    );
  }

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
