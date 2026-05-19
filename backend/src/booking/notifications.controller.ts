import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  list(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const n = limit ? Number.parseInt(limit, 10) : 50;
    return this.bookingService.listMyNotifications(user, Number.isFinite(n) ? n : 50);
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingService.markNotificationRead(user, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.bookingService.markAllNotificationsRead(user);
  }
}
