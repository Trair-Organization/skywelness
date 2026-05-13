import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import { CafeProductsService } from './cafe-products.service';

@Controller('cafe/products')
export class CafeProductsController {
  constructor(private readonly service: CafeProductsService) {}

  /** Public: ürün kataloğunu getir (tenant subdomain ile) */
  @Get()
  @UseGuards(JwtAuthGuard)
  listProducts(@Query('tenant') tenantSubdomain: string) {
    return this.service.listProducts(tenantSubdomain);
  }

  /** Admin: ürün ekle */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  createProduct(
    @CurrentUser() admin: User,
    @Body()
    body: {
      name: string;
      category: string;
      description?: string;
      price: number;
      imageUrl?: string;
    },
  ) {
    return this.service.createProduct(admin.tenantId, body);
  }

  /** Admin: ürün güncelle */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  updateProduct(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body()
    body: {
      name?: string;
      category?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.service.updateProduct(admin.tenantId, id, body);
  }

  /** Admin: ürün sil */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  deleteProduct(
    @CurrentUser() admin: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.service.deleteProduct(admin.tenantId, id);
  }

  /** Admin: tüm ürünleri listele (aktif + pasif) */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMINISTRATOR)
  listAllProducts(@CurrentUser() admin: User) {
    return this.service.listAllProducts(admin.tenantId);
  }
}
