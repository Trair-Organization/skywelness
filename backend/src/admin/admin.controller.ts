import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../database/enums';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { AdminMembersService } from './admin-members.service';
import { AssignPackageTrainerDto } from './dto/assign-package-trainer.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminMembers: AdminMembersService) {}

  /** Smoke test: JWT + administrator role only. */
  @Get('ping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  ping() {
    return { ok: true, scope: 'admin' };
  }

  @Get('pending-members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  pendingMembers(@CurrentUser() admin: User) {
    return this.adminMembers.listPendingMembers(admin.tenantId);
  }

  @Post('members/:userId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  approveMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.approveMember(admin.tenantId, userId);
  }

  @Post('members/:userId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  rejectMember(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.rejectMember(admin.tenantId, userId);
  }

  @Get('members/:userId/packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listMemberPackages(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.adminMembers.listMemberPackages(admin.tenantId, userId);
  }

  @Post('members/:userId/packages/:packageId/assign-trainer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  assignPackageTrainer(
    @CurrentUser() admin: User,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Param('packageId', new ParseUUIDPipe({ version: '4' })) packageId: string,
    @Body() dto: AssignPackageTrainerDto,
  ) {
    return this.adminMembers.assignPackageTrainer(
      admin.tenantId,
      userId,
      packageId,
      dto.trainerId ?? null,
    );
  }
}
