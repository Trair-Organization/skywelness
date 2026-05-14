import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { ServiceCatalog } from '../database/entities/service-catalog.entity';
import { ScheduleSlot } from '../database/entities/schedule-slot.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Addon } from '../database/entities/addon.entity';
import { UnifiedBookingController } from './unified-booking.controller';
import { UnifiedBookingService } from './unified-booking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceCatalog,
      ScheduleSlot,
      Appointment,
      Trainer,
      User,
      Tenant,
      Addon,
    ]),
    AuthModule,
    MailModule,
  ],
  controllers: [UnifiedBookingController],
  providers: [UnifiedBookingService],
  exports: [UnifiedBookingService],
})
export class UnifiedBookingModule {}
