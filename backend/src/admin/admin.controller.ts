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

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminMembers: AdminMembersService,
    private readonly cafeOrders: CafeOrdersService,
    private readonly bookingService: BookingService,
    private readonly mailService: MailService,
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

  /** Diagnostic: probe the active mail transport (SMTP verify). */
  @Get('mail/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  mailHealth() {
    return this.mailService.verifyTransport();
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

  @Get('pending-members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  pendingMembers(@CurrentUser() admin: User) {
    return this.adminMembers.listPendingMembers(admin.tenantId);
  }

  @Post('members/:userId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  approveMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.approveMember(admin.tenantId, userId);
  }

  @Post('members/:userId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rejectMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.rejectMember(admin.tenantId, userId);
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
}
