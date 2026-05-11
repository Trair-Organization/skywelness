import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Tenant } from '../database/entities/tenant.entity';
import { TenantVisibilityAudit } from '../database/entities/tenant-visibility-audit.entity';
import { User } from '../database/entities/user.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantJoinRequestController } from './tenant-join-request.controller';
import { TenantJoinRequestService } from './tenant-join-request.service';
import {
  PlatformAdminTenantVisibilityController,
  TenantVisibilityAdminController,
} from './tenant-visibility-admin.controller';
import { TenantVisibilityService } from './tenant-visibility.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantVisibilityAudit, User]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    TenantsController,
    TenantJoinRequestController,
    TenantVisibilityAdminController,
    PlatformAdminTenantVisibilityController,
  ],
  providers: [TenantsService, TenantJoinRequestService, TenantVisibilityService],
  exports: [TenantsService, TenantVisibilityService],
})
export class TenantsModule {}
