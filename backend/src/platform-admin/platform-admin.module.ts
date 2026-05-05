import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { User } from '../database/entities/user.entity';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([TrainerApplication, User])],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, RolesGuard],
})
export class PlatformAdminModule {}
