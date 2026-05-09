import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Lead } from '../database/entities/lead.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Tenant]), AuthModule, NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService, RolesGuard],
})
export class LeadsModule {}
