import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../database/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminMembersService } from './admin-members.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User])],
  controllers: [AdminController],
  providers: [RolesGuard, AdminMembersService],
})
export class AdminModule {}
