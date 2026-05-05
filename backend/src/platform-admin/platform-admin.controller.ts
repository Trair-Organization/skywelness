import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/enums';
import { User } from '../database/entities/user.entity';
import { ReviewTrainerApplicationDto } from './dto/review-trainer-application.dto';
import { PlatformAdminService } from './platform-admin.service';

@Controller('platform-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class PlatformAdminController {
  constructor(private readonly platformAdminService: PlatformAdminService) {}

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
