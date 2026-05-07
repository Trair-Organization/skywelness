import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
}
