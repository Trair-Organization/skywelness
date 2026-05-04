import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ClubEvent } from '../database/entities/club-event.entity';
import { ClubEventRegistration } from '../database/entities/club-event-registration.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { ClubEventsMemberService } from './club-events-member.service';
import { MemberEventsController } from './member-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ClubEvent, ClubEventRegistration]), AuthModule],
  controllers: [MemberEventsController],
  providers: [ClubEventsMemberService, RolesGuard, MemberApprovalGuard],
})
export class EventsModule {}
