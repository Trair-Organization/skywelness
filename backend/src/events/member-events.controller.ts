import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { ClubEventsMemberService } from './club-events-member.service';

@Controller('events')
export class MemberEventsController {
  constructor(private readonly clubEvents: ClubEventsMemberService) {}

  @Get('upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  upcoming(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.clubEvents.listUpcoming(user, limit);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
  @Roles(UserRole.MEMBER)
  join(@CurrentUser() user: User, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.clubEvents.join(user, id);
  }

  @Delete(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
  @Roles(UserRole.MEMBER)
  leave(@CurrentUser() user: User, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.clubEvents.leave(user, id);
  }
}
