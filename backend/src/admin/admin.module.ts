import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { Package } from '../database/entities/package.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminEventsService } from './admin-events.service';
import { AdminMembersService } from './admin-members.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, Package, Trainer, ClubEvent, ClubEventRegistration]),
  ],
  controllers: [AdminController, AdminEventsController],
  providers: [RolesGuard, AdminMembersService, AdminEventsService],
})
export class AdminModule {}
