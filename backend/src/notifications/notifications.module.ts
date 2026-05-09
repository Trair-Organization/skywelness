import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { PushService } from './push.service';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PushService, SmsService],
  exports: [PushService, SmsService],
})
export class NotificationsModule {}
