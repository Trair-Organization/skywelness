import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpaServiceService } from './spa.service';

@Controller('spa')
export class SpaController {
  constructor(private readonly spaService: SpaServiceService) {}

  /** Public: Spa hizmet kataloğu (keşif ekranı). */
  @Get('services/public/:tenantSubdomain')
  @SkipThrottle()
  async listPublicServices(@Param('tenantSubdomain') subdomain: string) {
    return this.spaService.listPublicServicesBySubdomain(subdomain);
  }

  /** Üye: Hizmet kataloğu. */
  @Get('services')
  @UseGuards(JwtAuthGuard)
  listServices(@CurrentUser() user: User, @Query('category') category?: string) {
    return this.spaService.listServices(user.tenantId, category);
  }

  /** Üye: Masöz listesi. */
  @Get('therapists')
  @UseGuards(JwtAuthGuard)
  listTherapists(@CurrentUser() user: User) {
    return this.spaService.listTherapists(user.tenantId);
  }

  /** Üye: Paket listesi. */
  @Get('packages')
  @UseGuards(JwtAuthGuard)
  listPackages(@CurrentUser() user: User) {
    return this.spaService.listPackages(user.tenantId);
  }

  /** Üye: Belirli bir tarih için müsait masaj slotları. */
  @Get('available-slots')
  @UseGuards(JwtAuthGuard)
  getAvailableSlots(@Query('date') date: string) {
    if (!date) {
      throw new Error('date query parameter is required');
    }
    return this.spaService.getAvailableSlots(date);
  }

  /** Üye: Satın alınabilir masaj paket tipleri. */
  @Get('package-types')
  @UseGuards(JwtAuthGuard)
  listPackageTypes(@CurrentUser() user: User) {
    return this.spaService.listPackageTypes(user.tenantId);
  }

  /** Üye: Masaj paketi bakiyesi. */
  @Get('my-package-balance')
  @UseGuards(JwtAuthGuard)
  getMyPackageBalance(@CurrentUser() user: User) {
    return this.spaService.getMyPackageBalance(user.id);
  }

  /** Üye: Müsait slot'u rezerve et. */
  @Post('book-slot')
  @UseGuards(JwtAuthGuard)
  bookSlot(@CurrentUser() user: User, @Body() body: { availabilityId: string; serviceId: string }) {
    return this.spaService.bookSlot(user.id, user.tenantId, body.availabilityId, body.serviceId);
  }

  /** Üye: Spa rezervasyonunu iptal et (3 saat kuralı). */
  @Post('cancel/:reservationId')
  @UseGuards(JwtAuthGuard)
  cancelSpaReservation(@CurrentUser() user: User, @Param('reservationId') reservationId: string) {
    return this.spaService.cancelSpaReservation(user.id, reservationId);
  }

  /** Üye: Rezervasyon oluştur. */
  @Post('bookings')
  @UseGuards(JwtAuthGuard)
  createBooking(
    @CurrentUser() user: User,
    @Body()
    body: {
      serviceId: string;
      therapistId?: string;
      bookingDate: string;
      timeSlot: string;
      notes?: string;
    },
  ) {
    return this.spaService.createBooking({
      tenantId: user.tenantId,
      userId: user.id,
      serviceId: body.serviceId,
      therapistId: body.therapistId,
      bookingDate: body.bookingDate,
      timeSlot: body.timeSlot,
      notes: body.notes,
    });
  }

  /** Üye: Rezervasyonlarım. */
  @Get('bookings')
  @UseGuards(JwtAuthGuard)
  listMyBookings(@CurrentUser() user: User) {
    return this.spaService.listUserBookings(user.id, user.tenantId);
  }

  /** Üye: Rezervasyon iptal. */
  @Delete('bookings/:id')
  @UseGuards(JwtAuthGuard)
  cancelBooking(@CurrentUser() user: User, @Param('id') id: string) {
    return this.spaService.cancelBooking(id, user.id);
  }

  /** Üye: Yorum ekle. */
  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  addReview(
    @CurrentUser() user: User,
    @Body() body: { bookingId: string; rating: number; comment?: string },
  ) {
    return this.spaService.addReview({
      bookingId: body.bookingId,
      userId: user.id,
      rating: body.rating,
      comment: body.comment,
    });
  }
}
