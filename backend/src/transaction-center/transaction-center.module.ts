import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../common/guards/roles.guard';
import { CafeOrder } from '../database/entities/cafe-order.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { Package } from '../database/entities/package.entity';
import { PackageType } from '../database/entities/package-type.entity';
import { PaymentTransaction } from '../database/entities/payment-transaction.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { SpaService } from '../database/entities/spa-service.entity';
import { User } from '../database/entities/user.entity';
import { TransactionCenterController } from './transaction-center.controller';
import { TransactionCenterService } from './transaction-center.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      PaymentTransaction,
      Reservation,
      CafeOrder,
      ClubEvent,
      ClubEventRegistration,
      Package,
      PackageType,
      SpaService,
      User,
    ]),
  ],
  controllers: [TransactionCenterController],
  providers: [RolesGuard, TransactionCenterService],
})
export class TransactionCenterModule {}
