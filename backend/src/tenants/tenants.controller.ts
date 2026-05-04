import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /** Public: list clubs for member onboarding (name + subdomain). */
  @Get()
  list() {
    return this.tenantsService.listPublicDirectory();
  }

  /** Public: mobile/web can verify tenant before login/register. */
  @Get('by-subdomain/:subdomain')
  bySubdomain(@Param('subdomain') subdomain: string) {
    const s = subdomain?.trim().toLowerCase() ?? '';
    if (s.length < 2 || s.length > 100 || !/^[a-z0-9-]+$/.test(s)) {
      throw new BadRequestException('Invalid subdomain');
    }
    return this.tenantsService.findPublicBySubdomain(s);
  }
}
