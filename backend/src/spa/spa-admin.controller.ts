import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SpaServiceService } from './spa.service';

@Controller('spa/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR, UserRole.PLATFORM_ADMIN)
export class SpaAdminController {
  constructor(private readonly spaService: SpaServiceService) {}

  // ─── Hizmet Yönetimi ────────────────────────────────────────────────────────

  @Get('services')
  listServices(@CurrentUser() user: User) {
    return this.spaService.listServices(user.tenantId);
  }

  @Post('services')
  createService(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.spaService.createService(user.tenantId, body);
  }

  @Patch('services/:id')
  updateService(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.spaService.updateService(id, user.tenantId, body);
  }

  @Delete('services/:id')
  deleteService(@CurrentUser() user: User, @Param('id') id: string) {
    return this.spaService.deleteService(id, user.tenantId);
  }

  // ─── Masöz Yönetimi ────────────────────────────────────────────────────────

  @Get('therapists')
  listTherapists(@CurrentUser() user: User) {
    return this.spaService.listTherapists(user.tenantId, true);
  }

  @Post('therapists')
  createTherapist(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.spaService.createTherapist(user.tenantId, body);
  }

  @Patch('therapists/:id')
  updateTherapist(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.spaService.updateTherapist(id, user.tenantId, body);
  }

  @Delete('therapists/:id')
  deleteTherapist(@CurrentUser() user: User, @Param('id') id: string) {
    return this.spaService.deleteTherapist(id, user.tenantId);
  }

  // ─── Paket Yönetimi ────────────────────────────────────────────────────────

  @Get('packages')
  listPackages(@CurrentUser() user: User) {
    return this.spaService.listPackages(user.tenantId);
  }

  @Post('packages')
  createPackage(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.spaService.createPackage(user.tenantId, body);
  }

  @Patch('packages/:id')
  updatePackage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.spaService.updatePackage(id, user.tenantId, body);
  }

  // ─── Rezervasyon Yönetimi ───────────────────────────────────────────────────

  @Get('bookings')
  listBookings(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.spaService.listAllBookings(user.tenantId, status);
  }

  @Patch('bookings/:id/status')
  updateBookingStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { status: string; adminNote?: string },
  ) {
    return this.spaService.updateBookingStatus(id, user.tenantId, body.status, body.adminNote);
  }
}
