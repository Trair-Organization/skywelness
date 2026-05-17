import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { EventWaitingList } from '../database/entities/event-waiting-list.entity';
import { EventReview } from '../database/entities/event-review.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { ClubEventsMemberService } from './club-events-member.service';
import { EventSchedulerService } from './event-scheduler.service';
import { MemberEventsController } from './member-events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClubEvent, ClubEventRegistration, EventWaitingList, EventReview]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [MemberEventsController],
  providers: [ClubEventsMemberService, EventSchedulerService, RolesGuard, MemberApprovalGuard],
})
export class EventsModule {}
