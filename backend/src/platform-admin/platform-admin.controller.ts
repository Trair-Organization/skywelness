import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { AssignTrainerTenantDto } from './dto/assign-trainer-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ManageUserDto } from './dto/manage-user.dto';
import { ReviewTrainerApplicationDto } from './dto/review-trainer-application.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PlatformAdminService } from './platform-admin.service';

@Controller('platform-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

  @Get('overview')
  overview() {
    return this.platformAdminService.getOverview();
  }

  @Get('tenants')
  listTenants(@Query('q') q?: string) {
    return this.platformAdminService.listTenants(q);
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto, @CurrentUser() reviewer: User) {
    return this.platformAdminService.createTenant(dto, reviewer);
  }

  @Patch('tenants/:tenantId')
  updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() reviewer: User,
  ) {
    return this.platformAdminService.updateTenant(tenantId, dto, reviewer);
  }

  @Get('users')
  listUsers(
    @Query('tenantId') tenantId?: string,
    @Query('role') role?: UserRole,
    @Query('q') q?: string,
  ) {
    return this.platformAdminService.listUsers({ tenantId, role, q });
  }

  @Patch('users/:userId/status')
  updateUserStatus(@Param('userId') userId: string, @Body() dto: UpdateUserStatusDto) {
    return this.platformAdminService.updateUserStatus(userId, dto.status);
  }

  @Patch('users/:userId/manage')
  manageUser(
    @Param('userId') userId: string,
    @Body() dto: ManageUserDto,
    @CurrentUser() reviewer: User,
  ) {
    return this.platformAdminService.manageUser(userId, dto, reviewer);
  }

  @Get('trainers')
  listTrainers(@Query('tenantId') tenantId?: string, @Query('q') q?: string) {
    return this.platformAdminService.listTrainers({ tenantId, q });
  }

  @Patch('trainers/:trainerId/tenant')
  assignTrainerTenant(
    @Param('trainerId') trainerId: string,
    @Body() dto: AssignTrainerTenantDto,
    @CurrentUser() reviewer: User,
  ) {
    return this.platformAdminService.assignTrainerTenant(
      trainerId,
      dto.tenantId,
      reviewer,
      dto.note,
    );
  }

  @Get('audit-logs')
  auditLogs(@Query('limit') limit?: string) {
    return this.platformAdminService.listAuditLogs(limit ? Number(limit) : 100);
  }

  @Post('push-notifications/send')
  sendGlobalPush(
    @CurrentUser() admin: User,
    @Body()
    body: {
      title: string;
      message: string;
      imageUrl?: string;
      target: 'all' | 'members' | 'trainers' | 'tenant';
      tenantId?: string;
    },
  ) {
    return this.platformAdminService.sendGlobalPush(admin, body);
  }

  @Get('trainer-applications/pending')
  listPendingTrainerApplications() {
    return this.platformAdminService.listPendingTrainerApplications();
  }

  @Post('trainer-applications/:applicationId/approve')
  approveTrainerApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser() reviewer: User,
    @Body() body: ReviewTrainerApplicationDto,
  ) {
    return this.platformAdminService.approveTrainerApplication(applicationId, reviewer, body.note);
  }

  @Post('trainer-applications/:applicationId/reject')
  rejectTrainerApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser() reviewer: User,
    @Body() body: ReviewTrainerApplicationDto,
  ) {
    return this.platformAdminService.rejectTrainerApplication(applicationId, reviewer, body.note);
  }
}
