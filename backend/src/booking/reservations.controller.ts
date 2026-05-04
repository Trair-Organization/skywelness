import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
export class ReservationsController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @Roles(UserRole.MEMBER)
  listMine(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const n = limit ? Number.parseInt(limit, 10) : 50;
    return this.bookingService.listMyReservations(user, Number.isFinite(n) ? n : 50);
  }

  @Post()
  @Roles(UserRole.MEMBER)
  create(@CurrentUser() user: User, @Body() dto: CreateReservationDto) {
    return this.bookingService.createReservation(user, dto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.MEMBER)
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.bookingService.cancelReservation(user, id);
  }
}
