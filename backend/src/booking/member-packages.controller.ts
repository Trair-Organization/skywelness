import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';

@Controller('my-packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER)
export class MemberPackagesController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.bookingService.listMyPackages(user);
  }
}
