import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../database/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '../database/entities/user.entity';
import { AdminEventsService } from './admin-events.service';
import { CreateClubEventDto } from './dto/create-club-event.dto';
import { UpdateClubEventDto } from './dto/update-club-event.dto';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
export class AdminEventsController {
  constructor(private readonly adminEvents: AdminEventsService) {}

  @Get()
  list(@CurrentUser() admin: User) {
    return this.adminEvents.list(admin.tenantId);
  }

  @Post()
  create(@CurrentUser() admin: User, @Body() dto: CreateClubEventDto) {
    return this.adminEvents.create(admin.tenantId, dto, admin.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateClubEventDto,
  ) {
    return this.adminEvents.update(admin.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() admin: User, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.adminEvents.remove(admin.tenantId, id);
  }

  @Get(':id/participants')
  listParticipants(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.adminEvents.listParticipants(admin.tenantId, id);
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { newDate?: string },
  ) {
    return this.adminEvents.duplicate(admin.tenantId, id, body.newDate);
  }

  @Post(':id/notify')
  notifyParticipants(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { title: string; message: string },
  ) {
    return this.adminEvents.notifyParticipants(admin.tenantId, id, body.title, body.message);
  }

  /** Check-in: Katılımcıyı giriş yaptı olarak işaretle */
  @Post(':id/check-in/:registrationId')
  checkIn(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('registrationId', new ParseUUIDPipe({ version: '4' })) registrationId: string,
  ) {
    return this.adminEvents.checkInParticipant(admin.tenantId, id, registrationId);
  }

  /** Kulüp admin: eğitmenin oluşturduğu etkinliği onayla */
  @Post(':id/approve')
  approveEvent(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.adminEvents.approveEvent(admin.tenantId, id);
  }

  /** Kulüp admin: eğitmenin oluşturduğu etkinliği reddet */
  @Post(':id/reject')
  rejectEvent(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminEvents.rejectEvent(admin.tenantId, id, body.reason);
  }
}
