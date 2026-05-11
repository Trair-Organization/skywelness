import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { TenantJoinRequestService } from './tenant-join-request.service';

@Controller('tenants/:subdomain/join-requests')
@UseGuards(JwtAuthGuard)
export class TenantJoinRequestController {
  constructor(private readonly service: TenantJoinRequestService) {}

  /**
   * Private partner kulübe üyelik başvurusu.
   * Rate limited (spam önleme).
   */
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(
    @CurrentUser() user: User,
    @Param('subdomain') subdomain: string,
    @Body() body: { message?: string },
  ) {
    return this.service.createJoinRequest(user, subdomain.trim().toLowerCase(), body.message);
  }
}
