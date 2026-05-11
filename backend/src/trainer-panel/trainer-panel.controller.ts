import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TrainerPanelService } from './trainer-panel.service';

@Controller('trainer-panel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TRAINER, UserRole.INDEPENDENT_TRAINER)
export class TrainerPanelController {
  constructor(private readonly service: TrainerPanelService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.service.getDashboard(user);
  }

  // ─── Calendar ───────────────────────────────────────────────────────────────

  @Get('calendar')
  getCalendar(@CurrentUser() user: User, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getCalendar(user, from, to);
  }

  // ─── Availability ───────────────────────────────────────────────────────────

  @Post('availability')
  createAvailability(
    @CurrentUser() user: User,
    @Body() body: { date: string; startTime: string; endTime: string },
  ) {
    return this.service.createAvailability(user, body);
  }

  @Post('availability/bulk')
  createBulkAvailability(
    @CurrentUser() user: User,
    @Body()
    body: {
      startDate: string;
      weeks: number;
      days: number[];
      startTime: string;
      endTime: string;
    },
  ) {
    return this.service.createBulkAvailability(user, body);
  }

  @Patch('availability/:id')
  updateAvailability(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { startTime?: string; endTime?: string; available?: boolean },
  ) {
    return this.service.updateAvailability(user, id, body);
  }

  @Delete('availability/:id')
  deleteAvailability(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteAvailability(user, id);
  }

  // ─── Students ───────────────────────────────────────────────────────────────

  @Get('students')
  listStudents(@CurrentUser() user: User) {
    return this.service.listStudents(user);
  }

  @Get('students/:userId')
  getStudentDetail(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.getStudentDetail(user, userId);
  }

  @Post('students/add-external')
  addExternalStudent(
    @CurrentUser() user: User,
    @Body() body: { firstName: string; lastName: string; email: string; phone: string },
  ) {
    return this.service.addExternalStudent(user, body);
  }

  @Delete('students/:userId')
  archiveStudent(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.archiveStudent(user, userId);
  }

  @Get('students/:userId/notes')
  getStudentNotes(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.getStudentNotes(user, userId);
  }

  @Post('students/:userId/notes')
  addStudentNote(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { note: string },
  ) {
    return this.service.addStudentNote(user, userId, body.note);
  }

  @Get('students/:userId/history')
  getStudentHistory(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.getStudentHistory(user, userId);
  }

  @Get('students/:userId/packages')
  getStudentPackages(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.getStudentPackages(user, userId);
  }

  // ─── Lessons ────────────────────────────────────────────────────────────────

  @Get('lessons')
  getLessons(
    @CurrentUser() user: User,
    @Query('date') date?: string,
    @Query('view') view?: string,
  ) {
    return this.service.getLessons(user, date, view);
  }

  @Post('lessons')
  createLesson(
    @CurrentUser() user: User,
    @Body() body: { availabilityId: string; studentUserId: string; type?: string; notes?: string },
  ) {
    return this.service.createLesson(user, body);
  }

  @Post('lessons/:id/cancel')
  cancelLesson(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.cancelLesson(user, id, body.reason);
  }

  @Post('lessons/:id/reschedule')
  rescheduleLesson(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { newAvailabilityId: string; note?: string },
  ) {
    return this.service.rescheduleLesson(user, id, body.newAvailabilityId, body.note);
  }

  // ─── Profile ────────────────────────────────────────────────────────────────

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.service.getProfile(user);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: User,
    @Body()
    body: {
      bio?: string;
      specialties?: string[];
      certifications?: string[];
      experienceYears?: number;
      city?: string;
      photoUrl?: string;
      pricingNote?: string;
    },
  ) {
    return this.service.updateProfile(user, body);
  }
}
