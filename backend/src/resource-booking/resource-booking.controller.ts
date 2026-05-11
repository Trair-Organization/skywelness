import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ResourceBookingService } from './resource-booking.service';

@Controller('resource-booking')
export class ResourceBookingController {
  constructor(private readonly service: ResourceBookingService) {}

  // ─── Public (auth required) ─────────────────────────────────────────────────

  /** Kaynakları listele */
  @Get('resources')
  @UseGuards(JwtAuthGuard)
  listResources(@Query('tenant') tenantSubdomain: string) {
    return this.service.listResources(tenantSubdomain);
  }

  /** Müsait slotları getir */
  @Get('slots')
  @UseGuards(JwtAuthGuard)
  listSlots(
    @Query('tenant') tenantSubdomain: string,
    @Query('resourceId') resourceId: string,
    @Query('date') date: string,
  ) {
    return this.service.listAvailableSlots(tenantSubdomain, resourceId, date);
  }

  /** Add-on'ları listele */
  @Get('addons')
  @UseGuards(JwtAuthGuard)
  listAddons(@Query('tenant') tenantSubdomain: string) {
    return this.service.listAddons(tenantSubdomain);
  }

  /** Rezervasyon oluştur */
  @Post('book')
  @UseGuards(JwtAuthGuard)
  createBooking(
    @CurrentUser() user: User,
    @Query('tenant') tenantSubdomain: string,
    @Body()
    body: {
      resourceSlotId: string;
      participantCount?: number;
      participants?: Array<{ name: string; phone?: string }>;
      addons?: Array<{ addonId: string; quantity: number }>;
      notes?: string;
    },
  ) {
    return this.service.createBooking(user, tenantSubdomain, body);
  }

  /** Kullanıcının rezervasyonları */
  @Get('my-bookings')
  @UseGuards(JwtAuthGuard)
  myBookings(@CurrentUser() user: User, @Query('tenant') tenantSubdomain: string) {
    return this.service.listMyBookings(user, tenantSubdomain);
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  /** Admin: Tüm rezervasyonlar */
  @Get('admin/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  adminBookings(@CurrentUser() admin: User) {
    return this.service.listAllBookings(admin.tenantId);
  }

  /** Admin: Kaynak oluştur */
  @Post('admin/resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createResource(
    @CurrentUser() admin: User,
    @Body()
    body: {
      name: string;
      resourceType: string;
      capacity: number;
      durationMinutes: number;
      price: number;
      description?: string;
    },
  ) {
    return this.service.createResource(admin.tenantId, body);
  }

  /** Admin: Slot oluştur */
  @Post('admin/slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createSlots(
    @CurrentUser() admin: User,
    @Body()
    body: {
      resourceId: string;
      date: string;
      slots: Array<{ startTime: string; endTime: string; price?: number }>;
    },
  ) {
    return this.service.createSlots(admin.tenantId, body);
  }

  /** Admin: Add-on oluştur */
  @Post('admin/addons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createAddon(
    @CurrentUser() admin: User,
    @Body() body: { name: string; price: number; description?: string },
  ) {
    return this.service.createAddon(admin.tenantId, body);
  }

  /** Admin: Kaynakları listele */
  @Get('admin/resources')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  adminResources(@CurrentUser() admin: User) {
    return this.service.listAdminResources(admin.tenantId);
  }

  /** Admin: Add-on'ları listele */
  @Get('admin/addons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  adminAddons(@CurrentUser() admin: User) {
    return this.service.listAdminAddons(admin.tenantId);
  }

  /** Admin: Slotları listele (gün bazında) */
  @Get('admin/slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  adminSlots(
    @CurrentUser() admin: User,
    @Query('resourceId') resourceId: string,
    @Query('date') date: string,
  ) {
    return this.service.listAdminSlots(admin.tenantId, resourceId, date);
  }

  /** Admin: Slot sil */
  @Post('admin/slots/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteSlot(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteSlot(admin.tenantId, id);
  }

  /** Admin: Kaynak güncelle */
  @Post('admin/resources/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateResource(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body()
    body: {
      name?: string;
      price?: number;
      capacity?: number;
      durationMinutes?: number;
      active?: boolean;
    },
  ) {
    return this.service.updateResource(admin.tenantId, id, body);
  }

  /** Admin: Add-on güncelle */
  @Post('admin/addons/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateAddon(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { name?: string; price?: number; active?: boolean },
  ) {
    return this.service.updateAddon(admin.tenantId, id, body);
  }

  /** Admin: Rezervasyon onayla */
  @Post('admin/bookings/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  approveBooking(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.adminApproveBooking(admin.tenantId, id);
  }

  /** Admin: Rezervasyon reddet */
  @Post('admin/bookings/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rejectBooking(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.adminRejectBooking(admin.tenantId, id, body.reason);
  }

  /** Admin: Rezervasyon ileri tarihe al */
  @Post('admin/bookings/:id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rescheduleBooking(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { newSlotId: string },
  ) {
    return this.service.adminRescheduleBooking(admin.tenantId, id, body.newSlotId);
  }

  /** Kullanıcı: Rezervasyon iptal */
  @Post('cancel/:id')
  @UseGuards(JwtAuthGuard)
  cancelBooking(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.cancelBooking(user, id);
  }
}
