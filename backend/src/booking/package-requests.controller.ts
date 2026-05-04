import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';
import { CreatePackageRequestDto } from './dto/create-package-request.dto';

@Controller('package-requests')
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
export class PackageRequestsController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(UserRole.MEMBER)
  create(@CurrentUser() user: User, @Body() dto: CreatePackageRequestDto) {
    return this.bookingService.createPackageRequest(user, dto);
  }
}
