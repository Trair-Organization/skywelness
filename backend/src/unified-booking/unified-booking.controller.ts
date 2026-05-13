import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UnifiedBookingService } from './unified-booking.service';

/**
 * Unified Booking System API
 * 
 * Tüm sektörler için tek bir rezervasyon endpoint seti.
 * - /v2/services — Hizmet kataloğu
 * - /v2/schedule — Müsaitlik slotları
 * - /v2/appointments — Randevular
 */
@Controller('v2')
export class UnifiedBookingController {
  constructor(private readonly service: UnifiedBookingService) {}

  // ═══ SERVICES ═══════════════════════════════════════════════

  /** Public: Bir kulübün hizmetlerini listele */
  @Get('services')
  listServices(
    @Query('tenant') tenant: string,
    @Query('category') category?: string,
  ) {
    return this.service.listServices(tenant, category);
  }

  /** Admin: Hizmet oluştur */
  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createService(
    @CurrentUser() user: User,
    @Body() body: {
      name: string;
      description?: string;
      category: string;
      providerType: string;
      providerId?: string;
      durationMinutes?: number;
      price: number;
      currency?: string;
      capacity?: number;
      imageUrl?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.service.createService(user.tenantId, body);
  }

  // ═══ SCHEDULE ═══════════════════════════════════════════════

  /** Public: Bir hizmetin müsait slotlarını getir */
  @Get('schedule')
  listSlots(
    @Query('tenant') tenant: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.service.listAvailableSlots(tenant, serviceId, date);
  }

  /** Public: Bir provider'ın müsait slotlarını getir */
  @Get('schedule/provider')
  listProviderSlots(
    @Query('tenant') tenant: string,
    @Query('providerId') providerId: string,
    @Query('date') date: string,
  ) {
    return this.service.listProviderSlots(tenant, providerId, date);
  }

  /** Admin: Toplu slot oluştur */
  @Post('schedule/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  generateSlots(
    @CurrentUser() user: User,
    @Body() body: {
      serviceId: string;
      providerType: string;
      providerId?: string;
      startDate: string;
      endDate: string;
      startHour: number;
      endHour: number;
      durationMinutes?: number;
      price?: number;
    },
  ) {
    return this.service.generateSlots(user.tenantId, body);
  }

  // ═══ APPOINTMENTS ═══════════════════════════════════════════

  /** Üye: Randevu oluştur */
  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  createAppointment(
    @CurrentUser() user: User,
    @Body() body: { slotId: string; notes?: string; packageId?: string },
  ) {
    return this.service.createAppointment(user, body);
  }

  /** Üye: Kendi randevularını listele */
  @Get('appointments/my')
  @UseGuards(JwtAuthGuard)
  myAppointments(@CurrentUser() user: User) {
    return this.service.listMyAppointments(user);
  }

  /** Üye: Randevu iptal */
  @Delete('appointments/:id')
  @UseGuards(JwtAuthGuard)
  cancelAppointment(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.cancelAppointment(user, id);
  }

  /** Admin: Tenant randevularını listele */
  @Get('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listAppointments(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ) {
    return this.service.listTenantAppointments(user.tenantId, status);
  }

  /** Admin: Randevu durumunu güncelle */
  @Patch('appointments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateAppointment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { status: string; adminNote?: string },
  ) {
    return this.service.updateAppointmentStatus(user.tenantId, id, body.status, body.adminNote);
  }
}
