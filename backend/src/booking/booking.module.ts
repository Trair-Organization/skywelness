import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Package } from '../database/entities/package.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { TimeSlot } from '../database/entities/time-slot.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { WaitingListEntry } from '../database/entities/waiting-list.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { BookingCatalogController } from './booking-catalog.controller';
import { BookingService } from './booking.service';
import { MemberPackagesController } from './member-packages.controller';
import { ReservationsController } from './reservations.controller';
import { WaitingListController } from './waiting-list.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trainer, TimeSlot, Reservation, WaitingListEntry, Package]),
    AuthModule,
  ],
  controllers: [
    BookingCatalogController,
    ReservationsController,
    WaitingListController,
    MemberPackagesController,
  ],
  providers: [BookingService, RolesGuard],
})
export class BookingModule {}
