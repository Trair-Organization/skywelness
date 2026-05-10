import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { Availability } from '../database/entities/availability.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { SpaBooking } from '../database/entities/spa-booking.entity';
import { SpaPackage } from '../database/entities/spa-package.entity';
import { SpaReview } from '../database/entities/spa-review.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { SpaTherapist } from '../database/entities/spa-therapist.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { User } from '../database/entities/user.entity';
import { SpaController } from './spa.controller';
import { SpaAdminController } from './spa-admin.controller';
import { SpaServiceService } from './spa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpaService,
      SpaTherapist,
      SpaPackage,
      SpaBooking,
      SpaReview,
      Tenant,
      User,
      Availability,
      Reservation,
      Package,
      PackageType,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [SpaController, SpaAdminController],
  providers: [SpaServiceService, RolesGuard],
})
export class SpaModule {}
