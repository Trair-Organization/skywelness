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
