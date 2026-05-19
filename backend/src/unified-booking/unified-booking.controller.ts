import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
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
  listServices(@Query('tenant') tenant: string, @Query('category') category?: string) {
    return this.service.listServices(tenant, category);
  }

  /** Admin: Hizmet oluştur */
  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createService(
    @CurrentUser() user: User,
    @Body()
    body: {
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

  /** Public: Çift kişilik masaj müsaitliği (2+ masöz aynı saatte) */
  @Get('schedule/couples')
  listCouplesAvailability(@Query('tenant') tenant: string, @Query('date') date: string) {
    return this.service.listCouplesAvailability(tenant, date);
  }

  /** Public: Oda bazlı spa müsaitliği (oda + masöz eşleşmesi) */
  @Get('schedule/spa-rooms')
  listSpaRoomAvailability(
    @Query('tenant') tenant: string,
    @Query('date') date: string,
    @Query('participants') participants?: string,
  ) {
    return this.service.listSpaRoomAvailability(
      tenant,
      date,
      participants ? parseInt(participants) : undefined,
    );
  }

  /** Admin: Toplu slot oluştur */
  @Post('schedule/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  generateSlots(
    @CurrentUser() user: User,
    @Body()
    body: {
      serviceId: string;
      providerType: string;
      providerId?: string;
      resourceId?: string;
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

  /** Admin: Masaj odaları için toplu slot oluştur */
  @Post('schedule/generate-room-slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  generateRoomSlots(
    @CurrentUser() user: User,
    @Body()
    body: {
      roomId: string;
      startDate: string;
      endDate: string;
      startHour: number;
      endHour: number;
      durationMinutes?: number;
      price?: number;
    },
  ) {
    return this.service.generateRoomSlots(user.tenantId, body);
  }

  // ═══ ADDONS ═══════════════════════════════════════════════

  /** Public: Bir kulübün ek hizmetlerini listele */
  @Get('addons')
  listAddons(@Query('tenant') tenant: string) {
    return this.service.listAddons(tenant);
  }

  // ═══ APPOINTMENTS ═══════════════════════════════════════════

  /** Üye veya Misafir: Stripe Checkout session oluştur */
  @Post('checkout')
  createCheckout(
    @Body()
    body: {
      slotId: string;
      addons?: Array<{ addonId: string; quantity: number }>;
      guestName?: string;
      guestPhone?: string;
      guestEmail?: string;
    },
  ) {
    return this.service.createCheckoutSession(body);
  }

  /** Ücretli etkinlik için Stripe Checkout session oluştur */
  @Post('events/:id/checkout')
  createEventCheckout(
    @Param('id') eventId: string,
    @Body()
    body: {
      guestName?: string;
      guestPhone?: string;
      guestEmail?: string;
      userId?: string;
    },
  ) {
    return this.service.createEventCheckout({ eventId, ...body });
  }

  /** Paket satın alma için Stripe Checkout session oluştur */
  @Post('packages/:id/checkout')
  createPackageCheckout(
    @Param('id') packageTypeId: string,
    @Body()
    body: {
      guestName?: string;
      guestPhone?: string;
      guestEmail?: string;
      userId?: string;
    },
  ) {
    return this.service.createPackageCheckout({ packageTypeId, ...body });
  }

  /** Kampanya satın alma için Stripe Checkout session oluştur */
  @Post('campaigns/:id/checkout')
  createCampaignCheckout(
    @Param('id') campaignId: string,
    @Body()
    body: {
      guestName?: string;
      guestPhone?: string;
      guestEmail?: string;
      userId?: string;
    },
  ) {
    return this.service.createCampaignCheckout({ campaignId, ...body });
  }

  /** Stripe webhook callback — raw body + stripe-signature header */
  @Post('checkout/webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body || {}));
    return this.service.handleStripeWebhook(raw, signature);
  }

  /** Üye: Randevu oluştur */
  @Post('appointments')
  @UseGuards(JwtAuthGuard)
  createAppointment(
    @CurrentUser() user: User,
    @Body()
    body: {
      slotId: string;
      notes?: string;
      packageId?: string;
      addons?: Array<{ addonId: string; quantity: number }>;
    },
  ) {
    return this.service.createAppointment(user, body);
  }

  /** Üye: Oda bazlı spa randevusu (oda slotu + masöz slotları birlikte reserve) */
  @Post('appointments/spa-room')
  @UseGuards(JwtAuthGuard)
  createSpaRoomAppointment(
    @CurrentUser() user: User,
    @Body()
    body: {
      roomSlotId: string;
      therapistSlotIds: string[];
      packageId?: string;
      notes?: string;
    },
  ) {
    return this.service.createSpaRoomAppointment(user, body);
  }

  /** Üye: Aktif paketlerini listele */
  @Get('my-packages')
  @UseGuards(JwtAuthGuard)
  listMyPackages(@CurrentUser() user: User) {
    return this.service.listMyPackages(user);
  }

  /** Üye: Paketten seans kullanarak randevu oluştur (ödeme yok) */
  @Post('appointments/use-package')
  @UseGuards(JwtAuthGuard)
  usePackage(@CurrentUser() user: User, @Body() body: { slotId: string; packageId: string }) {
    return this.service.usePackageForAppointment(user, body);
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
  listAppointments(@CurrentUser() user: User, @Query('status') status?: string) {
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
