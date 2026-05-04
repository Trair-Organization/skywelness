import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';
import { JoinWaitingListDto } from './dto/join-waiting-list.dto';

@Controller('waiting-list')
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
export class WaitingListController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('join')
  @HttpCode(201)
  @Roles(UserRole.MEMBER)
  join(@CurrentUser() user: User, @Body() dto: JoinWaitingListDto) {
    return this.bookingService.joinWaitingList(user, dto);
  }
}
