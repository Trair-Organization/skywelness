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

  /** Tüm kulüpler (marketplace listesi). */
  @Get('clubs')
  listClubs(@Query('limit') limit?: string) {
    return this.discoveryService.listClubs(Number(limit) || 20);
  }

  /** Öne çıkan kulüpler (admin tarafından seçilmiş). */
  @Get('clubs/featured')
  listFeaturedClubs(@Query('limit') limit?: string) {
    return this.discoveryService.listFeaturedClubs(Number(limit) || 6);
  }

  /** Onaylı eğitmenler (profil bilgileriyle). */
  @Get('trainers')
  listTrainers(@Query('limit') limit?: string) {
    return this.discoveryService.listTrainers(Number(limit) || 20);
  }

  /** Yaklaşan etkinlikler (tüm kulüplerden). */
  @Get('events')
  listEvents(@Query('limit') limit?: string) {
    return this.discoveryService.listUpcomingEvents(Number(limit) || 10);
  }
}
