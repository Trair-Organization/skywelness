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

  @Get('students/search')
  searchUser(@CurrentUser() user: User, @Query('q') query: string) {
    return this.service.searchUser(user, query ?? '');
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

  @Post('students/add-by-id')
  addStudentById(@CurrentUser() user: User, @Body() body: { userId: string }) {
    return this.service.addStudentById(user, body.userId);
  }

  @Get('invite-code')
  getInviteCode(@CurrentUser() user: User) {
    return this.service.getInviteCode(user);
  }

  @Post('invite')
  sendInvite(@CurrentUser() user: User) {
    return this.service.sendInvite(user);
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

  @Get('requests')
  getPendingRequests(@CurrentUser() user: User) {
    return this.service.getPendingRequests(user);
  }

  @Post('requests/:id/approve')
  approveRequest(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.approveRequest(user, id);
  }

  @Post('requests/:id/reject')
  rejectRequest(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.rejectRequest(user, id, body.reason);
  }

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

  // ─── Club Connection ────────────────────────────────────────────────────────

  @Post('join-club')
  joinClubByCode(@CurrentUser() user: User, @Body() body: { clubCode: string }) {
    return this.service.joinClubByCode(user, body.clubCode);
  }

  // ─── Profil Düzenleme ───────────────────────────────────────────────────────

  /** Eğitmen kendi profil bilgilerini getirir */
  @Get('profile')
  getMyProfile(@CurrentUser() user: User) {
    return this.service.getMyProfile(user);
  }

  /** Eğitmen kendi profil bilgilerini günceller */
  @Patch('profile')
  updateMyProfile(
    @CurrentUser() user: User,
    @Body()
    body: {
      bio?: string;
      specializations?: string[];
      certifications?: string[];
      photoUrl?: string;
      offersSessionTypes?: string[];
      pricingNote?: string;
    },
  ) {
    return this.service.updateMyProfile(user, body);
  }

  // ─── Push Bildirim ──────────────────────────────────────────────────────────

  /** PT: öğrencilerine push bildirim gönder */
  @Post('push-notifications/send')
  sendPushToStudents(
    @CurrentUser() user: User,
    @Body()
    body: {
      title: string;
      message: string;
      imageUrl?: string;
    },
  ) {
    return this.service.sendPushToStudents(user, body);
  }

  // ─── Hizmetlerim (Resource CRUD) ───────────────────────────────────────────

  /** PT: hizmetlerimi listele */
  @Get('services')
  listMyServices(@CurrentUser() user: User) {
    return this.service.listMyServices(user);
  }

  /** PT: hizmet ekle */
  @Post('services')
  createService(
    @CurrentUser() user: User,
    @Body() body: { name: string; description?: string; durationMinutes: number; price: number; capacity?: number },
  ) {
    return this.service.createService(user, body);
  }

  /** PT: hizmet güncelle */
  @Patch('services/:id')
  updateService(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { name?: string; description?: string; durationMinutes?: number; price?: number; capacity?: number; active?: boolean },
  ) {
    return this.service.updateService(user, id, body);
  }

  /** PT: hizmet sil */
  @Delete('services/:id')
  deleteService(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteService(user, id);
  }

  // ─── Paketlerim (PackageType CRUD) ─────────────────────────────────────────

  /** PT: paketlerimi listele */
  @Get('packages')
  listMyPackages(@CurrentUser() user: User) {
    return this.service.listMyPackages(user);
  }

  /** PT: paket ekle */
  @Post('packages')
  createPackage(
    @CurrentUser() user: User,
    @Body() body: { name: string; sessionCount: number; price: number; validityDays: number; sessionType: string },
  ) {
    return this.service.createPackage(user, body);
  }

  /** PT: paket güncelle */
  @Patch('packages/:id')
  updatePackage(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { name?: string; sessionCount?: number; price?: number; validityDays?: number; active?: boolean },
  ) {
    return this.service.updatePackage(user, id, body);
  }

  /** PT: paket sil */
  @Delete('packages/:id')
  deletePackage(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deletePackage(user, id);
  }

  // ─── Etkinlik Yönetimi ──────────────────────────────────────────────────────

  /** Eğitmen: kendi etkinliklerini listele */
  @Get('events')
  listMyEvents(@CurrentUser() user: User) {
    return this.service.listTrainerEvents(user);
  }

  /** Eğitmen: etkinlik oluştur (onaya gider) */
  @Post('events')
  createEvent(@CurrentUser() user: User, @Body() body: {
    title: string;
    description?: string;
    location: string;
    startsAt: string;
    endsAt?: string;
    capacity?: number;
    category?: string;
    price?: number;
    requirements?: string;
    imageUrl?: string;
    recurringRule?: { frequency: 'daily' | 'weekly' | 'monthly'; daysOfWeek?: number[]; endDate?: string; interval?: number };
  }) {
    return this.service.createTrainerEvent(user, body);
  }

  /** Eğitmen: kendi etkinliğini sil */
  @Delete('events/:id')
  deleteEvent(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteTrainerEvent(user, id);
  }
}
