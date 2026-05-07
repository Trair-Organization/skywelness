import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { CafeOrdersService } from './cafe-orders.service';
import { CreateCafeOrderDto } from './dto/create-cafe-order.dto';

@Controller('cafe/orders')
@UseGuards(JwtAuthGuard)
export class CafeOrdersController {
  constructor(private readonly cafeOrders: CafeOrdersService) {}

  @Get('my')
  listMine(@CurrentUser() user: User) {
    return this.cafeOrders.listMyOrders(user);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateCafeOrderDto) {
    return this.cafeOrders.createOrder(user, dto);
  }

  @Post(':id/cancel')
  cancelMine(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.cafeOrders.cancelMyOrder(user, id);
  }
}
