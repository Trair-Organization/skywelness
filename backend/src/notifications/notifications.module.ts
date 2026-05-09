import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { MailModule } from '../mail/mail.module';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { PushService } from './push.service';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule],
  providers: [PushService, SmsService, NotificationDispatcher],
  exports: [PushService, SmsService, NotificationDispatcher],
})
export class NotificationsModule {}
