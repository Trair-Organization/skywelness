import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DiscoveryService } from './discovery.service';

/**
 * Public discovery endpoints — auth gerektirmez.
 * Keşif ekranı (ClubConnectScreen) bu endpoint'leri kullanır.
 */
@SkipThrottle()
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  /** Tüm kulüpler (marketplace listesi). Arama, kategori ve lokasyon filtresi. */
  @Get('clubs')
  listClubs(
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('search') search?: string,
    @Query('vertical') vertical?: string,
    @Query('sort') sort?: string,
  ) {
    return this.discoveryService.listClubs(
      Number(limit) || 20,
      city,
      district,
      search,
      vertical,
      sort,
    );
  }

  /** Öne çıkan kulüpler (admin tarafından seçilmiş). */
  @Get('clubs/featured')
  listFeaturedClubs(@Query('limit') limit?: string) {
    return this.discoveryService.listFeaturedClubs(Number(limit) || 6);
  }

  /** Onaylı eğitmenler (profil bilgileriyle). */
  @Get('trainers')
  listTrainers(@Query('limit') limit?: string, @Query('city') city?: string) {
    return this.discoveryService.listTrainers(Number(limit) || 20, city);
  }

  /** Yaklaşan etkinlikler (tüm kulüplerden). */
  @Get('events')
  listEvents(@Query('limit') limit?: string) {
    return this.discoveryService.listUpcomingEvents(Number(limit) || 10);
  }
}
