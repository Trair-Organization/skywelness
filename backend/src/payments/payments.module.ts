import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../database/entities/booking.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, ClubEventRegistration]), NotificationsModule],
  controllers: [StripeWebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
