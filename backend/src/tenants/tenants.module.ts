import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Tenant } from '../database/entities/tenant.entity';
import { TenantVisibilityAudit } from '../database/entities/tenant-visibility-audit.entity';
import { User } from '../database/entities/user.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { Resource } from '../database/entities/resource.entity';
import { ResourceSlot } from '../database/entities/resource-slot.entity';
import { Booking } from '../database/entities/booking.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantJoinRequestController } from './tenant-join-request.controller';
import { TenantJoinRequestService } from './tenant-join-request.service';
import { TenantProfileController } from './tenant-profile.controller';
import { TenantProfileService } from './tenant-profile.service';
import { TrainerPublicProfileController } from './trainer-profile.controller';
import {
  PlatformAdminTenantVisibilityController,
  TenantVisibilityAdminController,
} from './tenant-visibility-admin.controller';
import { TenantVisibilityService } from './tenant-visibility.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantVisibilityAudit,
      User,
      Trainer,
      Resource,
      ResourceSlot,
      Booking,
      ClubEvent,
      PackageType,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    TenantsController,
    TenantJoinRequestController,
    TenantProfileController,
    TrainerPublicProfileController,
    TenantVisibilityAdminController,
    PlatformAdminTenantVisibilityController,
  ],
  providers: [TenantsService, TenantJoinRequestService, TenantProfileService, TenantVisibilityService],
  exports: [TenantsService, TenantVisibilityService],
})
export class TenantsModule {}
