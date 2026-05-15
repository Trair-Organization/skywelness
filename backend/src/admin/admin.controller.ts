import {
  BadRequestException,
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
import { UserRole } from '../database/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { AdminMembersService } from './admin-members.service';
import { AssignPackageTrainerDto } from './dto/assign-package-trainer.dto';
import { CafeOrdersService } from '../booking/cafe-orders.service';
import { BookingService } from '../booking/booking.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../notifications/sms.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubAuditLog } from '../database/entities/club-audit-log.entity';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminMembers: AdminMembersService,
    private readonly cafeOrders: CafeOrdersService,
    private readonly bookingService: BookingService,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    @InjectRepository(ClubAuditLog) private readonly auditRepo: Repository<ClubAuditLog>,
  ) {}

  /** Dashboard istatistikleri */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getStats(@CurrentUser() admin: User) {
    return this.adminMembers.getDashboardStats(admin.tenantId);
  }

  /** Tüm üyeleri listele */
  @Get('members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listAllMembers(
    @CurrentUser() admin: User,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminMembers.listAllMembers(admin.tenantId, status, search);
  }

  /** Eğitmenleri listele */
  @Get('trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listTrainers(@CurrentUser() admin: User) {
    return this.adminMembers.listTrainers(admin.tenantId);
  }

  /** Kulübe başvuran eğitmen listesi (preferredClubSubdomain eşleşen) */
  @Get('trainer-applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listTrainerApplications(@CurrentUser() admin: User) {
    return this.adminMembers.listTrainerApplications(admin.tenantId);
  }

  /** Eğitmen başvurusunu onayla */
  @Post('trainer-applications/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  approveTrainerApplication(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { note?: string },
  ) {
    return this.adminMembers.approveTrainerApplication(admin, id, body.note);
  }

  /** Eğitmen başvurusunu reddet */
  @Post('trainer-applications/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rejectTrainerApplication(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { note?: string },
  ) {
    return this.adminMembers.rejectTrainerApplication(admin, id, body.note);
  }

  /** Diagnostic: probe the active mail transport (SMTP verify). */
  @Get('mail/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  mailHealth() {
    return this.mailService.verifyTransport();
  }

  /** Kulüp davet kodunu getir */
  @Get('club-invite-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getClubInviteCode(@CurrentUser() admin: User) {
    return this.adminMembers.getClubInviteCode(admin.tenantId);
  }

  /**
   * Diagnostic: send a test email through the active transport.
   * `to` defaults to the calling admin's address.
   */
  @Post('mail/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  async mailTest(@CurrentUser() admin: User, @Query('to') to?: string) {
    const recipient = (to ?? admin.email)?.trim();
    if (!recipient) {
      throw new BadRequestException('recipient (to) is required');
    }
    await this.mailService.sendTestEmail(recipient);
    return { ok: true, sentTo: recipient };
  }

  /** Smoke test: JWT + administrator role only. */
  @Get('ping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  ping() {
    return { ok: true, scope: 'admin' };
  }

  /** Admin: İşlem kayıtlarını listele (son 200) */
  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async listLogs(@CurrentUser() admin: User, @Query('limit') limit?: string) {
    const take = Math.min(parseInt(limit || '200') || 200, 500);
    const logs = await this.auditRepo.find({
      where: { tenantId: admin.tenantId },
      order: { createdAt: 'DESC' },
      take,
    });
    return logs;
  }

  /** Admin: İşlem kaydı oluştur (internal helper — diğer endpoint'lerden çağrılır) */
  private async logAction(
    admin: User,
    action: string,
    targetType?: string,
    targetId?: string,
    details?: Record<string, unknown>,
  ) {
    await this.auditRepo.save(
      this.auditRepo.create({
        tenantId: admin.tenantId,
        actorUserId: admin.id,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        details: details ?? {},
      }),
    );
  }

  @Get('pending-members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  pendingMembers(@CurrentUser() admin: User) {
    return this.adminMembers.listPendingMembers(admin.tenantId);
  }

  @Post('members/:userId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async approveMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    const result = await this.adminMembers.approveMember(admin.tenantId, userId);
    void this.logAction(admin, 'member_approved', 'user', userId);
    return result;
  }

  @Post('members/:userId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async rejectMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    const result = await this.adminMembers.rejectMember(admin.tenantId, userId);
    void this.logAction(admin, 'member_rejected', 'user', userId);
    return result;
  }

  @Get('members/:userId/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listMemberPackages(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.listMemberPackages(admin.tenantId, userId);
  }

  @Get('members/:userId/detail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getMemberDetail(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.getMemberDetail(admin.tenantId, userId);
  }

  /** Son aktiviteler (bildirim akışı) */
  @Get('activity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getRecentActivity(@CurrentUser() admin: User) {
    return this.adminMembers.getRecentActivity(admin.tenantId);
  }

  @Post('members/:userId/packages/:packageId/assign-trainer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  assignPackageTrainer(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('packageId', new ParseUUIDPipe({ version: '4' })) packageId: string,
    @Body() dto: AssignPackageTrainerDto,
  ) {
    return this.adminMembers.assignPackageTrainer(
      admin.tenantId,
      userId,
      packageId,
      dto.trainerId ?? null,
    );
  }

  @Get('cafe-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listCafeOrders(@CurrentUser() admin: User) {
    return this.cafeOrders.listTenantOrders(admin.tenantId);
  }

  @Post('cafe-orders/:orderId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  cancelCafeOrder(
    @CurrentUser() admin: User,
    @Param('orderId', new ParseUUIDPipe({ version: '4' })) orderId: string,
  ) {
    return this.cafeOrders.cancelTenantOrder(admin.tenantId, orderId);
  }

  @Get('reservation-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listReservationRequests(@CurrentUser() admin: User) {
    return this.bookingService.listPendingMassageReservations(admin.tenantId);
  }

  @Get('package-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listPackageRequests(@CurrentUser() admin: User) {
    return this.bookingService.listPackageRequests(admin.tenantId);
  }

  @Post('package-requests/:requestId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  approvePackageRequest(
    @CurrentUser() admin: User,
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Body() body: { packageTypeId: string; assignedTrainerId?: string; note?: string },
  ) {
    return this.bookingService.approvePackageRequest(admin.tenantId, requestId, body);
  }

  @Post('package-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rejectPackageRequest(
    @CurrentUser() admin: User,
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Body() body: { reason?: string },
  ) {
    return this.bookingService.rejectPackageRequest(admin.tenantId, requestId, body.reason);
  }

  @Patch('package-requests/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updatePackageRequestStatus(
    @CurrentUser() admin: User,
    @Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string,
    @Body()
    body: { status?: string; adminNote?: string; paymentStatus?: string; paymentMethod?: string },
  ) {
    return this.bookingService.updatePackageRequestStatus(admin.tenantId, requestId, body);
  }

  @Post('reservation-requests/:reservationId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  approveReservationRequest(
    @CurrentUser() admin: User,
    @Param('reservationId', new ParseUUIDPipe({ version: '4' })) reservationId: string,
  ) {
    return this.bookingService.approveReservationByAdmin(admin.tenantId, reservationId);
  }

  @Post('reservation-requests/:reservationId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rejectReservationRequest(
    @CurrentUser() admin: User,
    @Param('reservationId', new ParseUUIDPipe({ version: '4' })) reservationId: string,
  ) {
    return this.bookingService.rejectReservationByAdmin(admin.tenantId, reservationId);
  }

  /** Admin herhangi bir rezervasyonu iptal edebilir (pending veya confirmed) */
  @Post('reservations/:reservationId/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  cancelReservationByAdmin(
    @CurrentUser() admin: User,
    @Param('reservationId', new ParseUUIDPipe({ version: '4' })) reservationId: string,
  ) {
    return this.adminMembers.cancelReservationByAdmin(admin.tenantId, reservationId);
  }

  /** Admin üye adına randevu oluşturur */
  @Post('reservations/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createReservationByAdmin(
    @CurrentUser() admin: User,
    @Body()
    body: { trainerId: string; userId: string; date: string; startTime: string; endTime: string },
  ) {
    return this.adminMembers.createReservationByAdmin(admin.tenantId, body);
  }

  /** Admin rezervasyonu başka tarihe taşır */
  @Post('reservations/:reservationId/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rescheduleReservation(
    @CurrentUser() admin: User,
    @Param('reservationId', new ParseUUIDPipe({ version: '4' })) reservationId: string,
    @Body() body: { newDate: string; newStartTime: string; newEndTime: string },
  ) {
    return this.adminMembers.rescheduleReservation(
      admin.tenantId,
      reservationId,
      body.newDate,
      body.newStartTime,
      body.newEndTime,
    );
  }

  // ─── Eğitmen CRUD ────────────────────────────────────────────────────────────

  @Post('trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createTrainer(@CurrentUser() admin: User, @Body() body: Record<string, unknown>) {
    return this.adminMembers.createTrainer(admin.tenantId, body as never);
  }

  @Patch('trainers/:trainerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateTrainer(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminMembers.updateTrainer(admin.tenantId, trainerId, body);
  }

  @Delete('trainers/:trainerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteTrainer(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
  ) {
    return this.adminMembers.deleteTrainer(admin.tenantId, trainerId);
  }

  @Get('trainers/:trainerId/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getTrainerStats(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
  ) {
    return this.adminMembers.getTrainerStats(admin.tenantId, trainerId);
  }

  // ─── Paket Tipi CRUD ─────────────────────────────────────────────────────────

  @Get('package-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listPackageTypes(@CurrentUser() admin: User) {
    return this.adminMembers.listPackageTypes(admin.tenantId);
  }

  @Post('package-types')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createPackageType(@CurrentUser() admin: User, @Body() body: Record<string, unknown>) {
    return this.adminMembers.createPackageType(admin.tenantId, body as never);
  }

  @Patch('package-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updatePackageType(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminMembers.updatePackageType(admin.tenantId, id, body);
  }

  @Delete('package-types/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deletePackageType(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.adminMembers.deletePackageType(admin.tenantId, id);
  }

  // ─── Üyeye Paket Atama ───────────────────────────────────────────────────────

  @Post('members/:userId/assign-package')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  assignPackageToMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { packageTypeId: string; assignedTrainerId?: string },
  ) {
    return this.adminMembers.assignPackageToMember(admin.tenantId, userId, body);
  }

  // ─── Eğitmen Ajanda Yönetimi ─────────────────────────────────────────────────

  @Get('trainers/:trainerId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listTrainerSchedule(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.adminMembers.listTrainerSchedule(admin.tenantId, trainerId, from, to);
  }

  @Post('trainers/:trainerId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  addTrainerAvailability(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Body() body: { date: string; startTime: string; endTime: string; available?: boolean },
  ) {
    return this.adminMembers.addTrainerAvailability(admin.tenantId, trainerId, body);
  }

  @Post('trainers/:trainerId/schedule/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  bulkAddTrainerAvailability(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Body()
    body: {
      startDate: string;
      endDate: string;
      weekdays: number[];
      startTime: string;
      endTime: string;
    },
  ) {
    return this.adminMembers.bulkAddTrainerAvailability(admin.tenantId, trainerId, body);
  }

  @Patch('trainers/:trainerId/schedule/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateTrainerAvailability(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Param('availabilityId', new ParseUUIDPipe({ version: '4' })) availabilityId: string,
    @Body() body: { startTime?: string; endTime?: string; available?: boolean },
  ) {
    return this.adminMembers.updateTrainerAvailability(
      admin.tenantId,
      trainerId,
      availabilityId,
      body,
    );
  }

  @Delete('trainers/:trainerId/schedule/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteTrainerAvailability(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Param('availabilityId', new ParseUUIDPipe({ version: '4' })) availabilityId: string,
  ) {
    return this.adminMembers.deleteTrainerAvailability(admin.tenantId, trainerId, availabilityId);
  }

  @Delete('trainers/:trainerId/schedule-day')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  clearTrainerDay(
    @CurrentUser() admin: User,
    @Param('trainerId', new ParseUUIDPipe({ version: '4' })) trainerId: string,
    @Query('date') date: string,
  ) {
    return this.adminMembers.clearTrainerDay(admin.tenantId, trainerId, date);
  }

  // ─── Masöz Ajanda Yönetimi ───────────────────────────────────────────────────

  @Get('therapists/schedules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listTherapistSchedules(@CurrentUser() admin: User) {
    return this.adminMembers.listTherapistSchedules(admin.tenantId);
  }

  @Get('therapists/:therapistId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getTherapistSchedule(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
  ) {
    return this.adminMembers.getTherapistSchedule(admin.tenantId, therapistId);
  }

  @Patch('therapists/:therapistId/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateTherapistSchedule(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
    @Body() body: { workingHours: Record<string, string> },
  ) {
    return this.adminMembers.updateTherapistSchedule(
      admin.tenantId,
      therapistId,
      body.workingHours,
    );
  }

  // ─── Masöz Takvim (Eğitmenlerle aynı mantık) ─────────────────────────────────

  @Get('therapists/:therapistId/calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listTherapistCalendar(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.adminMembers.listTherapistCalendar(admin.tenantId, therapistId, from, to);
  }

  @Post('therapists/:therapistId/calendar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  addTherapistAvailability(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
    @Body() body: { date: string; startTime: string; endTime: string },
  ) {
    return this.adminMembers.addTherapistAvailability(admin.tenantId, therapistId, body);
  }

  @Post('therapists/:therapistId/calendar/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  bulkAddTherapistAvailability(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
    @Body()
    body: {
      startDate: string;
      endDate: string;
      weekdays: number[];
      startTime: string;
      endTime: string;
    },
  ) {
    return this.adminMembers.bulkAddTherapistAvailability(admin.tenantId, therapistId, body);
  }

  @Delete('therapists/:therapistId/calendar/:availabilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteTherapistAvailability(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
    @Param('availabilityId', new ParseUUIDPipe({ version: '4' })) availabilityId: string,
  ) {
    return this.adminMembers.deleteTherapistAvailability(
      admin.tenantId,
      therapistId,
      availabilityId,
    );
  }

  @Delete('therapists/:therapistId/calendar-day')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  clearTherapistDay(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
    @Query('date') date: string,
  ) {
    return this.adminMembers.clearTherapistDay(admin.tenantId, therapistId, date);
  }

  // ─── Masöz Rezervasyon ───────────────────────────────────────────────────────

  @Get('therapists/:therapistId/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listServicesForTherapist(
    @CurrentUser() admin: User,
    @Param('therapistId', new ParseUUIDPipe({ version: '4' })) therapistId: string,
  ) {
    return this.adminMembers.listSpaServicesForBooking(admin.tenantId, therapistId);
  }

  @Post('therapists/reservations/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createTherapistReservation(
    @CurrentUser() admin: User,
    @Body()
    body: {
      therapistId: string;
      userId: string;
      date: string;
      startTime: string;
      endTime?: string;
      serviceId?: string;
    },
  ) {
    return this.adminMembers.createTherapistReservationByAdmin(admin.tenantId, body);
  }

  @Post('therapists/reservations/:reservationId/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rescheduleTherapistReservation(
    @CurrentUser() admin: User,
    @Param('reservationId', new ParseUUIDPipe({ version: '4' })) reservationId: string,
    @Body()
    body: { newDate: string; newStartTime: string; newEndTime: string; therapistId?: string },
  ) {
    return this.adminMembers.rescheduleTherapistReservation(
      admin.tenantId,
      reservationId,
      body.newDate,
      body.newStartTime,
      body.newEndTime,
      body.therapistId,
    );
  }

  // ─── Birleşik Günlük Ajanda ──────────────────────────────────────────────────

  @Post('members/quick-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  quickCreateMember(
    @CurrentUser() admin: User,
    @Body() body: { firstName: string; lastName: string; phone?: string; email?: string },
  ) {
    return this.adminMembers.quickCreateMember(admin.tenantId, body);
  }

  /** Admin: Üye şifresini sıfırla */
  @Post('members/:userId/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async resetMemberPassword(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    const result = await this.adminMembers.resetMemberPassword(admin.tenantId, userId);
    void this.logAction(admin, 'password_reset', 'user', userId);
    return result;
  }

  /** Admin: Üye profilini güncelle */
  @Patch('members/:userId/update-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateMemberProfile(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { firstName?: string; lastName?: string; phone?: string | null; email?: string },
  ) {
    return this.adminMembers.updateMemberProfile(admin.tenantId, userId, body);
  }

  /** Admin: Üyeyi kalıcı olarak sil */
  @Delete('members/:userId/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async deleteMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    const result = await this.adminMembers.deleteMember(admin.tenantId, userId);
    void this.logAction(admin, 'member_deleted', 'user', userId);
    return result;
  }

  /** Admin: Üyeye PT (eğitmen) ata */
  @Post('members/:userId/assign-trainer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async assignTrainerToMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { trainerId: string },
  ) {
    const result = await this.adminMembers.assignTrainerToMember(admin.tenantId, userId, body.trainerId);
    void this.logAction(admin, 'trainer_assigned', 'user', userId, { trainerId: body.trainerId });
    return result;
  }

  /** Admin: Üyeden eğitmen atamasını kaldır */
  @Post('members/:userId/remove-trainer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async removeTrainerFromMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { trainerId: string },
  ) {
    const result = await this.adminMembers.removeTrainerFromMember(admin.tenantId, userId, body.trainerId);
    void this.logAction(admin, 'trainer_removed', 'user', userId, { trainerId: body.trainerId });
    return result;
  }

  /** Admin: Üye hesabını dondur */
  @Post('members/:userId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  suspendMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminMembers.suspendMember(admin.tenantId, userId, body.reason);
  }

  /** Admin: Üye hesabını aktifleştir */
  @Post('members/:userId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  reactivateMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.reactivateMember(admin.tenantId, userId);
  }

  /** Admin: Üye notu ekle */
  @Post('members/:userId/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  addMemberNote(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { note: string },
  ) {
    return this.adminMembers.addMemberNote(admin.tenantId, userId, body.note, admin.id);
  }

  /** Admin: Üye notunu güncelle */
  @Patch('members/:userId/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateMemberNote(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { index: number; text: string },
  ) {
    return this.adminMembers.updateMemberNote(admin.tenantId, userId, body.index, body.text);
  }

  /** Admin: Üye notunu sil */
  @Delete('members/:userId/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteMemberNote(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { index: number },
  ) {
    return this.adminMembers.deleteMemberNote(admin.tenantId, userId, body.index);
  }

  /** Admin: Üye notlarını getir */
  @Get('members/:userId/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getMemberNotes(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.getMemberNotes(admin.tenantId, userId);
  }

  /** Admin: Paket süresini uzat */
  @Post('members/:userId/packages/:packageId/extend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  extendPackageExpiry(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('packageId', new ParseUUIDPipe({ version: '4' })) packageId: string,
    @Body() body: { extraDays: number },
  ) {
    return this.adminMembers.extendPackageExpiry(admin.tenantId, userId, packageId, body.extraDays);
  }

  /** Admin: Toplu üye ekleme */
  @Post('members/bulk-create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  bulkCreateMembers(
    @CurrentUser() admin: User,
    @Body()
    body: {
      members: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>;
    },
  ) {
    return this.adminMembers.bulkCreateMembers(admin.tenantId, body.members);
  }

  /** Admin: Üyelik oluştur/güncelle */
  @Post('members/:userId/membership')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  setMembership(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() body: { membershipType: string; startDate: string; endDate: string; price?: number },
  ) {
    return this.adminMembers.setMembership(admin.tenantId, userId, body);
  }

  /** Admin: Mevcut pakete seans ekle (+N) */
  @Post('members/:userId/packages/:packageId/add-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  addSessionsToPackage(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('packageId', new ParseUUIDPipe({ version: '4' })) packageId: string,
    @Body() body: { sessions: number },
  ) {
    return this.adminMembers.addSessionsToPackage(admin.tenantId, userId, packageId, body.sessions);
  }

  /** Admin: Üyenin paketini sil */
  @Delete('members/:userId/packages/:packageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteMemberPackage(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('packageId', new ParseUUIDPipe({ version: '4' })) packageId: string,
  ) {
    return this.adminMembers.deleteMemberPackage(admin.tenantId, userId, packageId);
  }

  @Post('schedule/bulk-open')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  bulkOpenAvailability(
    @CurrentUser() admin: User,
    @Body()
    body: {
      trainerIds?: string[];
      therapistIds?: string[];
      startDate: string;
      endDate: string;
      weekdays: number[];
      startTime: string;
      endTime: string;
    },
  ) {
    return this.adminMembers.bulkOpenAvailability(admin.tenantId, body);
  }

  @Get('schedule/daily/trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  dailyTrainerGrid(@CurrentUser() admin: User, @Query('date') date: string) {
    if (!date) throw new BadRequestException('date zorunlu');
    return this.adminMembers.listDailyTrainerGrid(admin.tenantId, date);
  }

  @Get('schedule/daily/therapists')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  dailyTherapistGrid(@CurrentUser() admin: User, @Query('date') date: string) {
    if (!date) throw new BadRequestException('date zorunlu');
    return this.adminMembers.listDailyTherapistGrid(admin.tenantId, date);
  }

  @Get('schedule/daily/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  dailyScheduleSummary(@CurrentUser() admin: User, @Query('date') date: string) {
    if (!date) throw new BadRequestException('date zorunlu');
    return this.adminMembers.getDailyScheduleSummary(admin.tenantId, date);
  }

  // ─── Kulüp Profil Yönetimi ───────────────────────────────────────────────────

  /** Kulüp profil bilgilerini getir */
  @Get('tenant/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  getTenantProfile(@CurrentUser() admin: User) {
    return this.adminMembers.getTenantProfile(admin.tenantId);
  }

  /** Kulüp profil bilgilerini güncelle */
  @Patch('tenant/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateTenantProfile(
    @CurrentUser() admin: User,
    @Body()
    body: {
      description?: string;
      location?: string;
      services?: string[];
      logoUrl?: string;
      coverImageUrl?: string;
      galleryImages?: string[];
      phone?: string;
      email?: string;
      website?: string;
      priceRange?: string;
    },
  ) {
    return this.adminMembers.updateTenantProfile(admin.tenantId, body);
  }

  // ─── Push Bildirim Yönetimi ───────────────────────────────────────────────────

  /** Kulüp admin: üyelerine/eğitmenlerine push bildirim gönder */
  @Post('push-notifications/send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  sendPushNotification(
    @CurrentUser() admin: User,
    @Body()
    body: {
      title: string;
      message: string;
      imageUrl?: string;
      target: 'members' | 'trainers' | 'all';
      /** Opsiyonel: etkinlik ID'si (etkinlik duyurusu olarak gönderilir) */
      eventId?: string;
    },
  ) {
    return this.adminMembers.sendPushNotification(admin.tenantId, body);
  }

  // ─── TOPLU İŞLEMLER ──────────────────────────────────────────────────────────

  /** Toplu SMS gönder */
  @Post('members/bulk-sms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async bulkSms(
    @CurrentUser() admin: User,
    @Body() body: { memberIds: string[]; message: string },
  ) {
    if (!body.memberIds?.length || !body.message?.trim()) {
      throw new BadRequestException('memberIds ve message zorunludur');
    }
    const members = await this.adminMembers.getMembersByIds(admin.tenantId, body.memberIds);
    let sent = 0;
    let failed = 0;
    for (const member of members) {
      if (!member.phone) { failed++; continue; }
      const result = await this.smsService.send(member.phone, body.message.trim());
      if (result.ok) sent++;
      else failed++;
    }
    // Audit log
    await this.logAction(admin, 'bulk_sms', 'member', undefined, { count: members.length, sent, failed, messagePreview: body.message.slice(0, 100) });
    return { total: members.length, sent, failed };
  }

  /** Toplu Mail gönder */
  @Post('members/bulk-mail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async bulkMail(
    @CurrentUser() admin: User,
    @Body() body: { memberIds: string[]; subject: string; message: string },
  ) {
    if (!body.memberIds?.length || !body.subject?.trim() || !body.message?.trim()) {
      throw new BadRequestException('memberIds, subject ve message zorunludur');
    }
    const members = await this.adminMembers.getMembersByIds(admin.tenantId, body.memberIds);
    let sent = 0;
    let failed = 0;
    for (const member of members) {
      try {
        await this.mailService['send']({
          to: [member.email],
          subject: body.subject.trim(),
          html: `<div style="font-family:sans-serif;padding:20px;"><p>${body.message.replace(/\n/g, '<br>')}</p></div>`,
          text: body.message,
        });
        sent++;
      } catch {
        failed++;
      }
    }
    // Audit log
    await this.logAction(admin, 'bulk_mail', 'member', undefined, { count: members.length, sent, failed, subject: body.subject.slice(0, 100) });
    return { total: members.length, sent, failed };
  }

  /** Toplu paket ata */
  @Post('members/bulk-package')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  async bulkPackage(
    @CurrentUser() admin: User,
    @Body() body: { memberIds: string[]; packageTypeId: string; trainerId?: string },
  ) {
    if (!body.memberIds?.length || !body.packageTypeId) {
      throw new BadRequestException('memberIds ve packageTypeId zorunludur');
    }
    const results = await this.adminMembers.bulkAssignPackage(
      admin.tenantId,
      body.memberIds,
      body.packageTypeId,
      body.trainerId,
    );
    // Audit log
    await this.logAction(admin, 'bulk_package_assign', 'member', undefined, { count: body.memberIds.length, packageTypeId: body.packageTypeId, ...results });
    return results;
  }
}
