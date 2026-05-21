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

  /** Üye bu etkinliğe katılmış mı? */
  @Get(':id/my-status')
  @UseGuards(JwtAuthGuard)
  myStatus(@CurrentUser() user: User, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.clubEvents.getMyStatus(user, id);
  }

  @Delete(':id/join')
  @UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
  @Roles(UserRole.MEMBER)
  leave(@CurrentUser() user: User, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.clubEvents.leave(user, id);
  }

  /** Bekleme listesine katıl */
  @Post(':id/waitlist')
  @UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
  @Roles(UserRole.MEMBER)
  joinWaitlist(@CurrentUser() user: User, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.clubEvents.joinWaitlist(user, id);
  }

  /** Etkinliği değerlendir (1-5 yıldız) */
  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
  @Roles(UserRole.MEMBER)
  review(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('rating', ParseIntPipe) rating: number,
    @Query('comment') comment?: string,
  ) {
    return this.clubEvents.reviewEvent(user, id, rating, comment);
  }
}
