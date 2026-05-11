import { Body, Controller, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import type { TenantVisibilityMode } from '../database/entities/tenant.entity';
import { TenantVisibilityService } from './tenant-visibility.service';

/**
 * Kulüp admin'i kendi tenant'ının visibility modunu değiştirir.
 * Requirement 3.
 */
@Controller('admin/tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
export class TenantVisibilityAdminController {
  constructor(private readonly service: TenantVisibilityService) {}

  @Patch('visibility')
  update(@CurrentUser() admin: User, @Body() body: { visibilityMode: TenantVisibilityMode }) {
    return this.service.updateByClubAdmin(
      admin.tenantId,
      admin.id,
      admin.role,
      body.visibilityMode,
    );
  }
}

/**
 * Platform admin herhangi bir tenant'ın visibility'sini değiştirebilir.
 * Requirement 12.
 */
@Controller('platform-admin/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformAdminTenantVisibilityController {
  constructor(private readonly service: TenantVisibilityService) {}

  @Patch(':tenantId/visibility')
  update(
    @CurrentUser() admin: User,
    @Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
    @Body() body: { visibilityMode: TenantVisibilityMode },
  ) {
    return this.service.updateByPlatformAdmin(tenantId, admin.id, body.visibilityMode);
  }
}
