import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConnectionsService } from './connections.service';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly service: ConnectionsService) {}

  /** Public ID ile kullanıcı/kulüp ara */
  @Get('lookup/:publicId')
  lookup(@Param('publicId') publicId: string) {
    return this.service.findByPublicId(publicId);
  }

  /** Bağlantı isteği gönder (kullanıcı olarak) */
  @Post('send')
  sendRequest(
    @CurrentUser() user: User,
    @Body() body: { receiverPublicId: string; message?: string },
  ) {
    return this.service.sendRequest(user, body.receiverPublicId, body.message);
  }

  /** Bağlantı isteği gönder (kulüp admin olarak) */
  @Post('send-as-club')
  sendRequestAsClub(
    @CurrentUser() user: User,
    @Body() body: { receiverPublicId: string; message?: string },
  ) {
    return this.service.sendRequestAsClub(user, body.receiverPublicId, body.message);
  }

  /** İsteği kabul et */
  @Post(':id/accept')
  acceptRequest(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.acceptRequest(user, id);
  }

  /** İsteği reddet */
  @Post(':id/reject')
  rejectRequest(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.rejectRequest(user, id, body.reason);
  }

  /** İsteği iptal et */
  @Post(':id/cancel')
  cancelRequest(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.cancelRequest(user, id);
  }

  /** Gelen istekler */
  @Get('incoming')
  getIncoming(@CurrentUser() user: User) {
    return this.service.getIncomingRequests(user);
  }

  /** Gönderilen istekler */
  @Get('sent')
  getSent(@CurrentUser() user: User) {
    return this.service.getSentRequests(user);
  }

  /** Kabul edilen bağlantılar */
  @Get('accepted')
  getAccepted(@CurrentUser() user: User) {
    return this.service.getAcceptedConnections(user);
  }
}
