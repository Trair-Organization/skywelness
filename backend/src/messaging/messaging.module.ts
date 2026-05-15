import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { User } from '../database/entities/user.entity';
import { UserBlock } from '../database/entities/user-block.entity';
import { MessageReport } from '../database/entities/message-report.entity';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, User, UserBlock, MessageReport]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
