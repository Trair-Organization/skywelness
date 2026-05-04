import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AppNotification } from '../database/entities/notification.entity';
import { PackageRequest } from '../database/entities/package-request.entity';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { TimeSlot } from '../database/entities/time-slot.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { WaitingListEntry } from '../database/entities/waiting-list.entity';
import { MailModule } from '../mail/mail.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { BookingCatalogController } from './booking-catalog.controller';
import { BookingService } from './booking.service';
import { MemberPackagesController } from './member-packages.controller';
import { ReservationsController } from './reservations.controller';
import { PackageRequestsController } from './package-requests.controller';
import { WaitingListController } from './waiting-list.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trainer,
      TimeSlot,
      Reservation,
      WaitingListEntry,
      Package,
      PackageRequest,
      User,
      Tenant,
      AppNotification,
    ]),
    AuthModule,
    MailModule,
  ],
  controllers: [
    BookingCatalogController,
    ReservationsController,
    WaitingListController,
    MemberPackagesController,
    PackageRequestsController,
  ],
  providers: [BookingService, RolesGuard],
})
export class BookingModule {}
