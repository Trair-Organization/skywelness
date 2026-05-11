import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { MemberApprovalGuard } from '../common/guards/member-approval.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/enums';
import type { User } from '../database/entities/user.entity';
import { BookingService } from './booking.service';
import { TrainerPanelService } from '../trainer-panel/trainer-panel.service';
import { ConnectTrainerDto } from './dto/connect-trainer.dto';
import { CreateTrainerMemberNoteDto } from './dto/create-trainer-member-note.dto';

@Controller('trainer-network')
@UseGuards(JwtAuthGuard, RolesGuard, MemberApprovalGuard)
export class TrainerNetworkController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly trainerPanelService: TrainerPanelService,
  ) {}

  @Get('my-trainers')
  @Roles(UserRole.MEMBER)
  listMyTrainers(@CurrentUser() user: User) {
    return this.bookingService.listMyConnectedTrainers(user);
  }

  @Post('connect')
  @Roles(UserRole.MEMBER)
  connectTrainer(@CurrentUser() user: User, @Body() dto: ConnectTrainerDto) {
    return this.bookingService.connectMemberToTrainer(user, dto.trainerId);
  }

  @Post('connect-by-code')
  @Roles(UserRole.MEMBER)
  connectByInviteCode(@CurrentUser() user: User, @Body() body: { inviteCode: string }) {
    return this.trainerPanelService.connectByInviteCode(user, body.inviteCode);
  }

  @Get('my-students')
  @Roles(UserRole.TRAINER, UserRole.INDEPENDENT_TRAINER)
  listMyStudents(@CurrentUser() user: User) {
    return this.bookingService.listTrainerStudents(user);
  }

  @Post('student-note')
  @Roles(UserRole.TRAINER, UserRole.INDEPENDENT_TRAINER)
  addStudentNote(@CurrentUser() user: User, @Body() dto: CreateTrainerMemberNoteDto) {
    return this.bookingService.addTrainerStudentNote(user, dto.memberUserId, dto.note);
  }

  @Get('notes')
  @Roles(UserRole.MEMBER, UserRole.TRAINER, UserRole.INDEPENDENT_TRAINER)
  listNotes(@CurrentUser() user: User, @Query('memberUserId') memberUserId?: string) {
    return this.bookingService.listTrainerMemberNotes(user, memberUserId);
  }
}
