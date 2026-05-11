import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Availability } from '../database/entities/availability.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { TrainerMemberNote } from '../database/entities/trainer-member-note.entity';
import { Package } from '../database/entities/package.entity';
import { User } from '../database/entities/user.entity';
import { Conversation } from '../database/entities/conversation.entity';
import { TrainerPanelController } from './trainer-panel.controller';
import { TrainerPanelService } from './trainer-panel.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Availability,
      Reservation,
      Trainer,
      TrainerProfile,
      TrainerMemberLink,
      TrainerMemberNote,
      Package,
      User,
      Conversation,
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [TrainerPanelController],
  providers: [TrainerPanelService],
})
export class TrainerPanelModule {}
