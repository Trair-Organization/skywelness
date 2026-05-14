import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { TrainersQueryDto } from './dto/trainers-query.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
@Roles(UserRole.MEMBER, UserRole.TRAINER, UserRole.INDEPENDENT_TRAINER, UserRole.ADMINISTRATOR)
export class BookingCatalogController {
  constructor(private readonly bookingService: BookingService) {}

  /** @deprecated Use GET /v2/services instead */
  @Get('trainers')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-12-31')
  @Header('Link', '</api/v1/v2/services>; rel="successor-version"')
  listTrainers(@CurrentUser() user: User, @Query() query: TrainersQueryDto) {
    const includeIndependent = !query.sessionType && user.role === UserRole.MEMBER;
    return this.bookingService.listTrainers(user.tenantId, query.sessionType, includeIndependent);
  }

  /** @deprecated Use GET /v2/schedule instead */
  @Get('availability')
  @Header('Deprecation', 'true')
  @Header('Sunset', '2026-12-31')
  @Header('Link', '</api/v1/v2/schedule>; rel="successor-version"')
  listAvailability(@CurrentUser() user: User, @Query() query: AvailabilityQueryDto) {
    return this.bookingService.listAvailability(
      user.tenantId,
      query.trainerId,
      query.from,
      query.to,
    );
  }
}
