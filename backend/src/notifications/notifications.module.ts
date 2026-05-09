import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { PushService } from './push.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [PushService],
  exports: [PushService],
})
export class NotificationsModule {}
