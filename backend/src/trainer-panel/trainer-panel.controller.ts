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

  /** Çalışma şablonu uygula (haftalar × günler × saat aralığı) */
  @Post('availability/template')
  applyScheduleTemplate(
    @CurrentUser() user: User,
    @Body()
    body: {
      startDate: string;
      weeks: number;
      weekdays: number[];
      startHour: number;
      endHour: number;
      slotMinutes?: number;
    },
  ) {
    return this.service.applyScheduleTemplate(user, body);
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

  /** Eğitmenin tenant'ındaki tüm aktif üyeler (ders oluştururken kullanmak için). */
  @Get('available-members')
  listAvailableMembers(@CurrentUser() user: User) {
    return this.service.listAvailableMembers(user);
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
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      birthDate?: string | null;
      gender?: 'male' | 'female' | 'other' | null;
      healthNotes?: string | null;
      heightCm?: number | null;
      weightKg?: number | null;
      goalCategory?: string | null;
      goalTitle?: string | null;
      goalTargetValue?: number | null;
      goalTargetUnit?: string | null;
      sendInvite?: boolean;
    },
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

  /** Bir üyenin aktif PT paketlerini getir (ders oluştururken paket seçmek için, link şartı yok). */
  @Get('members/:userId/active-packages')
  getMemberActivePackages(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.getMemberActivePackagesForBooking(user, userId);
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

  /** Doğrudan tarih+saat vererek ders oluştur (slot otomatik oluşturulur). */
  @Post('lessons/direct')
  createLessonDirect(
    @CurrentUser() user: User,
    @Body()
    body: {
      studentUserId: string;
      date: string;
      startTime: string;
      endTime: string;
      type?: string;
      notes?: string;
      packageId?: string;
      recurringWeeks?: number;
    },
  ) {
    return this.service.createLessonDirect(user, body);
  }

  /** Doğrudan tarih+saat ile dersi taşı. */
  @Post('lessons/:id/reschedule-direct')
  rescheduleLessonDirect(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { newDate: string; newStartTime: string; newEndTime: string; note?: string },
  ) {
    return this.service.rescheduleLessonDirect(user, id, body);
  }

  /** Dersi tamamlandı olarak işaretle. */
  @Post('lessons/:id/complete')
  completeLesson(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.completeLesson(user, id);
  }

  /** Üyeye manuel hatırlatma gönder. */
  @Post('lessons/:id/remind')
  remindLesson(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.remindLesson(user, id);
  }

  /** Belirli günün tüm slotlarını sil (rezervasyonsuzsa). */
  @Delete('schedule-day')
  clearDay(@CurrentUser() user: User, @Query('date') date: string) {
    return this.service.clearDay(user, date);
  }

  // ─── Profile ────────────────────────────────────────────────────────────────

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.service.getProfile(user);
  }

  @Get('earnings')
  getEarnings(@CurrentUser() user: User) {
    return this.service.getEarnings(user);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: User,
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      bio?: string;
      specialties?: string[];
      certifications?: string[];
      experienceYears?: number;
      city?: string;
      photoUrl?: string;
      pricingNote?: string;
      offersSessionTypes?: string[];
    },
  ) {
    return this.service.updateProfile(user, body);
  }

  // ─── Club Connection ────────────────────────────────────────────────────────

  @Post('join-club')
  joinClubByCode(@CurrentUser() user: User, @Body() body: { clubCode: string }) {
    return this.service.joinClubByCode(user, body.clubCode);
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

  /** PT: gönderdiği push bildirim geçmişi */
  @Get('push-notifications/history')
  listPushHistory(@CurrentUser() user: User) {
    return this.service.listPushHistory(user);
  }

  /** PT: birden fazla öğrenciye aynı mesajı tek istek ile gönder */
  @Post('messages/bulk')
  sendBulkMessage(
    @CurrentUser() user: User,
    @Body() body: { studentIds: string[]; content: string },
  ) {
    return this.service.sendBulkMessage(user, body);
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

  /** Eğitmen: kendi etkinliğini güncelle */
  @Patch('events/:id')
  updateEvent(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      location?: string;
      startsAt?: string;
      endsAt?: string | null;
      capacity?: number;
      category?: string;
      price?: number;
      requirements?: string;
      imageUrl?: string;
    },
  ) {
    return this.service.updateTrainerEvent(user, id, body);
  }

  // ─── Öğrenci Detay: Ölçümler ────────────────────────────────────────────────

  @Get('students/:userId/measurements')
  listMeasurements(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.listMeasurements(user, userId);
  }

  @Post('students/:userId/measurements')
  addMeasurement(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.addMeasurement(user, userId, body as never);
  }

  @Patch('measurements/:id')
  updateMeasurement(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateMeasurement(user, id, body as never);
  }

  @Delete('measurements/:id')
  deleteMeasurement(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteMeasurement(user, id);
  }

  // ─── Öğrenci Detay: Değerlendirmeler (FMS, Postür, VO2 Max) ─────────────────

  @Get('students/:userId/assessments')
  listAssessments(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Query('type') type?: string,
  ) {
    return this.service.listAssessments(user, userId, type as never);
  }

  @Post('students/:userId/assessments')
  addAssessment(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { type: string; assessedAt: string; data: Record<string, unknown>; notes?: string },
  ) {
    return this.service.addAssessment(user, userId, body as never);
  }

  @Patch('assessments/:id')
  updateAssessment(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { assessedAt?: string; data?: Record<string, unknown>; notes?: string },
  ) {
    return this.service.updateAssessment(user, id, body);
  }

  @Delete('assessments/:id')
  deleteAssessment(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteAssessment(user, id);
  }

  // ─── Öğrenci Detay: Fotoğraflar ─────────────────────────────────────────────

  @Get('students/:userId/photos')
  listMemberPhotos(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.service.listMemberPhotos(user, userId);
  }

  @Post('students/:userId/photos')
  addMemberPhoto(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { takenAt: string; photoUrl: string; tag?: string; notes?: string },
  ) {
    return this.service.addMemberPhoto(user, userId, body);
  }

  @Delete('photos/:id')
  deleteMemberPhoto(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteMemberPhoto(user, id);
  }

  // ─── Öğrenci Detay: Hedefler ────────────────────────────────────────────────

  @Get('students/:userId/goals')
  listGoals(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Query('status') status?: string,
  ) {
    return this.service.listGoals(user, userId, status as never);
  }

  @Post('students/:userId/goals')
  addGoal(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.addGoal(user, userId, body as never);
  }

  @Patch('goals/:id')
  updateGoal(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateGoal(user, id, body as never);
  }

  @Delete('goals/:id')
  deleteGoal(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteGoal(user, id);
  }

  // ─── Paket Satışı (Eğitmen → Öğrenci) ──────────────────────────────────────

  /** Eğitmen kendi öğrencisine paket atar/satar */
  @Post('students/:userId/sell-package')
  sellPackageToStudent(
    @CurrentUser() user: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { packageTypeId: string; notes?: string },
  ) {
    return this.service.sellPackageToStudent(user, {
      studentUserId: userId,
      packageTypeId: body.packageTypeId,
      notes: body.notes,
    });
  }
}
