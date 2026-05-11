import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BookingModule } from '../booking/booking.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { Availability } from '../database/entities/availability.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { SpaTherapist } from '../database/entities/spa-therapist.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { User } from '../database/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminEventsService } from './admin-events.service';
import { AdminMembersService } from './admin-members.service';

@Module({
  imports: [
    AuthModule,
    BookingModule,
    MailModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      User,
      Package,
      PackageType,
      Reservation,
      Trainer,
      TrainerApplication,
      TrainerProfile,
      Availability,
      SpaTherapist,
      SpaService,
      ClubEvent,
      ClubEventRegistration,
    ]),
  ],
  controllers: [AdminController, AdminEventsController],
  providers: [RolesGuard, AdminMembersService, AdminEventsService],
})
export class AdminModule {}
