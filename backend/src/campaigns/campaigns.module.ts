import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { Campaign } from '../database/entities/campaign.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { User } from '../database/entities/user.entity';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, Tenant, User]), AuthModule, NotificationsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, RolesGuard],
  exports: [CampaignsService],
})
export class CampaignsModule {}
