import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  /**
   * Public: Keşif ekranında gösterilecek öne çıkarılmış kampanyalar.
   * Sadece platform admin tarafından featured=true yapılmış olanlar döner.
   */
  @Get('featured')
  @SkipThrottle()
  listFeatured(@Query('limit') limit?: string) {
    const l = Math.min(Number(limit) || 6, 10);
    return this.campaignsService.listFeatured(l);
  }

  /**
   * Public: Tüm platformdaki aktif kampanyalar.
   * Onboarding ekranı ve giriş yapmamış kullanıcılar için.
   */
  @Get('public')
  @SkipThrottle()
  listPublic(@Query('limit') limit?: string) {
    const l = Math.min(Number(limit) || 10, 20);
    return this.campaignsService.listAllActive(l);
  }

  /**
   * Authenticated: Kullanıcının tenant'ına ait aktif kampanyalar.
   * MemberHomeScreen'de gösterilir.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  listForMember(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const l = Math.min(Number(limit) || 10, 20);
    return this.campaignsService.listActive(user.tenantId, l);
  }

  /**
   * Kampanya tıklanma kaydı (analytics).
   */
  @Post(':id/click')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async trackClick(@Param('id') id: string) {
    await this.campaignsService.incrementClick(id);
  }

  // ─── Admin Endpoints ───────────────────────────────────────────────────────

  /** Admin: Kendi kulübünün tüm kampanyalarını listele. */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  listAdmin(@CurrentUser() user: User) {
    return this.campaignsService.listByTenant(user.tenantId);
  }

  /** Admin: Yeni kampanya oluştur. */
  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  @HttpCode(201)
  create(@CurrentUser() user: User, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.tenantId, dto);
  }

  /** Admin: Kampanya güncelle. */
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(user.tenantId, id, dto);
  }

  /** Admin: Kampanya sil. */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.campaignsService.remove(user.tenantId, id);
  }

  /** Platform Admin: Kampanyayı keşif ekranında öne çıkar/kaldır. */
  @Patch(':id/featured')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async toggleFeatured(@Param('id') id: string, @Body() body: { featured: boolean }) {
    return this.campaignsService.setFeatured(id, body.featured);
  }
}
