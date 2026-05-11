import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Resource } from '../database/entities/resource.entity';
import { ResourceSlot } from '../database/entities/resource-slot.entity';
import { Booking } from '../database/entities/booking.entity';
import { Addon } from '../database/entities/addon.entity';
import { BookingAddon } from '../database/entities/booking-addon.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { ResourceBookingController } from './resource-booking.controller';
import { ResourceBookingService } from './resource-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Resource, ResourceSlot, Booking, Addon, BookingAddon, User, Tenant]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ResourceBookingController],
  providers: [ResourceBookingService],
})
export class ResourceBookingModule {}
