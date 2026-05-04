import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
@Roles(UserRole.MEMBER, UserRole.TRAINER, UserRole.ADMINISTRATOR)
export class BookingCatalogController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('trainers')
  listTrainers(@CurrentUser() user: User) {
    return this.bookingService.listTrainers(user.tenantId);
  }

  @Get('availability')
  listAvailability(@CurrentUser() user: User, @Query() query: AvailabilityQueryDto) {
    return this.bookingService.listAvailability(
      user.tenantId,
      query.trainerId,
      query.from,
      query.to,
    );
  }
}
