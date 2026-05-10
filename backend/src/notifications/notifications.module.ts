import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../database/entities/reservation.entity';
import { User } from '../database/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { PushService } from './push.service';
import { ReservationReminderService } from './reservation-reminder.service';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Reservation]), MailModule],
  providers: [PushService, SmsService, NotificationDispatcher, ReservationReminderService],
  exports: [PushService, SmsService, NotificationDispatcher],
})
export class NotificationsModule {}
