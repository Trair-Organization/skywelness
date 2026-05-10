import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PtMemberService } from './pt-member.service';

@Controller('pt')
@UseGuards(JwtAuthGuard)
export class PtMemberController {
  constructor(private readonly ptMemberService: PtMemberService) {}

  /** Üye: Belirli bir tarih için müsait PT slotları. */
  @Get('available-slots')
  getAvailableSlots(@Query('date') date: string) {
    if (!date) {
      throw new Error('date query parameter is required');
    }
    return this.ptMemberService.getAvailableSlots(date);
  }

  /** Üye: PT paketi bakiyesi. */
  @Get('my-package-balance')
  getMyPackageBalance(@CurrentUser() user: User) {
    return this.ptMemberService.getMyPackageBalance(user.id);
  }

  /** Üye: Müsait PT slot'unu rezerve et. */
  @Post('book-slot')
  bookSlot(@CurrentUser() user: User, @Body() body: { availabilityId: string; serviceId: string }) {
    return this.ptMemberService.bookSlot(user.id, user.tenantId, body.availabilityId);
  }

  /** Üye: PT rezervasyonunu iptal et (3 saat kuralı). */
  @Post('cancel/:reservationId')
  cancelPtReservation(@CurrentUser() user: User, @Param('reservationId') reservationId: string) {
    return this.ptMemberService.cancelPtReservation(user.id, reservationId);
  }
}
