import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * Public: Keşif ekranından lead oluştur.
   * Auth gerektirmez — giriş yapmamış kullanıcılar da form doldurabilir.
   */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(201)
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  /** Admin: Kendi kulübünün lead'leri. */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  @SkipThrottle()
  listAdmin(@CurrentUser() user: User) {
    return this.leadsService.listByTenant(user.tenantId);
  }

  /** Platform admin: Tüm lead'ler. */
  @Get('platform')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @SkipThrottle()
  listAll() {
    return this.leadsService.listAll();
  }

  /** Admin: Lead durumunu güncelle. */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  updateStatus(@Param('id') id: string, @Body() body: { status: string; adminNote?: string }) {
    return this.leadsService.updateStatus(id, body.status, body.adminNote);
  }
}
