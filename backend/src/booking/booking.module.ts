import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Availability } from '../database/entities/availability.entity';
import { AppNotification } from '../database/entities/notification.entity';
import { CafeOrder } from '../database/entities/cafe-order.entity';
import { PackageRequest } from '../database/entities/package-request.entity';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { TimeSlot } from '../database/entities/time-slot.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { TrainerMemberNote } from '../database/entities/trainer-member-note.entity';
import { User } from '../database/entities/user.entity';
import { WaitingListEntry } from '../database/entities/waiting-list.entity';
import { MailModule } from '../mail/mail.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { BookingCatalogController } from './booking-catalog.controller';
import { BookingService } from './booking.service';
import { MemberPackagesController } from './member-packages.controller';
import { PtMemberController } from './pt-member.controller';
import { PtMemberService } from './pt-member.service';
import { ReservationsController } from './reservations.controller';
import { TrainerNetworkController } from './trainer-network.controller';
import { PackageRequestsController } from './package-requests.controller';
import { NotificationsController } from './notifications.controller';
import { WaitingListController } from './waiting-list.controller';
import { CafeOrdersController } from './cafe-orders.controller';
import { CafeOrdersService } from './cafe-orders.service';

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
      CafeOrder,
      TrainerMemberLink,
      TrainerMemberNote,
      Availability,
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
    TrainerNetworkController,
    NotificationsController,
    CafeOrdersController,
    PtMemberController,
  ],
  providers: [BookingService, CafeOrdersService, PtMemberService, RolesGuard],
  exports: [CafeOrdersService, BookingService],
})
export class BookingModule {}
