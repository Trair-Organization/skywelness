import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { TransactionCenterService } from './transaction-center.service';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';

@Controller('admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
export class TransactionCenterController {
  constructor(private readonly service: TransactionCenterService) {}

  @Get()
  getTransactions(@CurrentUser() admin: User, @Query() filters: TransactionFiltersDto) {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new BadRequestException('Başlangıç tarihi bitiş tarihinden sonra olamaz');
    }
    return this.service.getTransactions(admin.tenantId, filters);
  }

  @Get('summary')
  getSummary(
    @CurrentUser() admin: User,
    @Query('memberId', ParseUUIDPipe) memberId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getSummary(admin.tenantId, memberId, startDate, endDate);
  }

  @Get('most-active')
  getMostActive(
    @CurrentUser() admin: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getMostActive(admin.tenantId, startDate, endDate);
  }

  @Get('member/:memberId/recent')
  getRecentTransactions(
    @CurrentUser() admin: User,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.service.getRecentTransactions(admin.tenantId, memberId);
  }
}
