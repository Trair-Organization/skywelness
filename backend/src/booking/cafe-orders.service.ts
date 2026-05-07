import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CafeOrder } from '../database/entities/cafe-order.entity';
import { User } from '../database/entities/user.entity';
import { UserRole } from '../database/enums';
import type { CreateCafeOrderDto } from './dto/create-cafe-order.dto';

@Injectable()
export class CafeOrdersService {
  constructor(
    @InjectRepository(CafeOrder)
    private readonly cafeOrdersRepo: Repository<CafeOrder>,
  ) {}

  async createOrder(user: User, dto: CreateCafeOrderDto) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can create cafe orders');
    }
    const items = dto.items.map((item) => ({
      productId: item.productId.trim(),
      title: item.title.trim(),
      imageUrl: item.imageUrl ?? null,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (totalAmount <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }
    const row = this.cafeOrdersRepo.create({
      tenantId: user.tenantId,
      memberUserId: user.id,
      customerName: dto.customerName.trim(),
      blockLabel: dto.blockLabel.trim(),
      apartmentLabel: dto.apartmentLabel.trim(),
      phoneNumber: dto.phoneNumber.trim(),
      paymentMethod: dto.paymentMethod,
      status: 'pending',
      itemsJson: items,
      totalAmount,
      cancelledAt: null,
    });
    await this.cafeOrdersRepo.save(row);
    return { id: row.id, status: row.status, createdAt: row.createdAt };
  }

  async listMyOrders(user: User) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can list their cafe orders');
    }
    const rows = await this.cafeOrdersRepo.find({
      where: { tenantId: user.tenantId, memberUserId: user.id },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return rows.map((row) => this.toView(row));
  }

  async cancelMyOrder(user: User, orderId: string) {
    if (user.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Only members can cancel their cafe orders');
    }
    const row = await this.cafeOrdersRepo.findOne({
      where: { id: orderId, tenantId: user.tenantId, memberUserId: user.id },
    });
    if (!row) {
      throw new NotFoundException('Order not found');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    row.status = 'cancelled';
    row.cancelledAt = new Date();
    await this.cafeOrdersRepo.save(row);
    return { ok: true as const, id: row.id, status: row.status };
  }

  async listTenantOrders(tenantId: string) {
    const rows = await this.cafeOrdersRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return rows.map((row) => this.toView(row));
  }

  async cancelTenantOrder(tenantId: string, orderId: string) {
    const row = await this.cafeOrdersRepo.findOne({ where: { id: orderId, tenantId } });
    if (!row) {
      throw new NotFoundException('Order not found');
    }
    if (row.status !== 'pending') {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    row.status = 'cancelled';
    row.cancelledAt = new Date();
    await this.cafeOrdersRepo.save(row);
    return { ok: true as const, id: row.id, status: row.status };
  }

  private toView(row: CafeOrder) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      memberUserId: row.memberUserId,
      customerName: row.customerName,
      blockLabel: row.blockLabel,
      apartmentLabel: row.apartmentLabel,
      phoneNumber: row.phoneNumber,
      paymentMethod: row.paymentMethod,
      status: row.status,
      totalAmount: row.totalAmount,
      cancelledAt: row.cancelledAt,
      items: row.itemsJson,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
