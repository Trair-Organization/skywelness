import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { TenantProfileService } from './tenant-profile.service';

/**
 * Partner profil sayfası endpoint'i.
 * Tek çağrıda tüm profil bilgilerini döner: tenant info, galeri, eğitmenler,
 * hizmetler, slotlar (ajanda), sosyal kanıt metrikleri.
 */
@Controller('tenants/:subdomain/profile')
export class TenantProfileController {
  constructor(private readonly service: TenantProfileService) {}

  /** Public: herkes profili görebilir (private kulüp bile tanıtım sayfasını gösterir) */
  @Get()
  getProfile(@Param('subdomain') subdomain: string) {
    return this.service.getProfile(subdomain.trim().toLowerCase());
  }

  /** Auth required: müsait slotları getir (ajanda) */
  @Get('slots')
  @UseGuards(JwtAuthGuard)
  getSlots(
    @CurrentUser() user: User,
    @Param('subdomain') subdomain: string,
    @Query('date') date?: string,
    @Query('resourceId') resourceId?: string,
  ) {
    return this.service.getAvailableSlots(
      user,
      subdomain.trim().toLowerCase(),
      date,
      resourceId,
    );
  }
}
