import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CafeProduct } from '../database/entities/cafe-product.entity';
import { Tenant } from '../database/entities/tenant.entity';

@Injectable()
export class CafeProductsService {
  constructor(
    @InjectRepository(CafeProduct)
    private readonly productsRepo: Repository<CafeProduct>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  /** Public: aktif ürünleri kategoriye göre grupla */
  async listProducts(tenantSubdomain: string) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain: tenantSubdomain } });
    if (!tenant) throw new NotFoundException('Cafe bulunamadı');

    const products = await this.productsRepo.find({
      where: { tenantId: tenant.id, active: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // Kategoriye göre grupla
    const categories: Record<string, typeof products> = {};
    for (const p of products) {
      if (!categories[p.category]) categories[p.category] = [];
      categories[p.category].push(p);
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      categories: Object.entries(categories).map(([category, items]) => ({
        category,
        items: items.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          currency: p.currency,
          imageUrl: p.imageUrl,
        })),
      })),
    };
  }

  /** Admin: tüm ürünler (aktif + pasif) */
  async listAllProducts(tenantId: string) {
    return this.productsRepo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /** Admin: ürün oluştur */
  async createProduct(
    tenantId: string,
    data: { name: string; category: string; description?: string; price: number; imageUrl?: string },
  ) {
    if (!data.name?.trim()) throw new BadRequestException('Ürün adı zorunludur');
    if (!data.category?.trim()) throw new BadRequestException('Kategori zorunludur');
    if (!data.price || data.price <= 0) throw new BadRequestException('Fiyat zorunludur');

    const product = this.productsRepo.create({
      tenantId,
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description?.trim() || null,
      price: data.price.toFixed(2),
      imageUrl: data.imageUrl?.trim() || null,
      active: true,
      sortOrder: 0,
    });
    await this.productsRepo.save(product);
    return { id: product.id, name: product.name };
  }

  /** Admin: ürün güncelle */
  async updateProduct(
    tenantId: string,
    productId: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    const product = await this.productsRepo.findOne({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Ürün bulunamadı');

    if (data.name !== undefined) product.name = data.name.trim();
    if (data.category !== undefined) product.category = data.category.trim();
    if (data.description !== undefined) product.description = data.description?.trim() || null;
    if (data.price !== undefined) product.price = data.price.toFixed(2);
    if (data.imageUrl !== undefined) product.imageUrl = data.imageUrl?.trim() || null;
    if (data.active !== undefined) product.active = data.active;
    if (data.sortOrder !== undefined) product.sortOrder = data.sortOrder;

    await this.productsRepo.save(product);
    return { ok: true };
  }

  /** Admin: ürün sil */
  async deleteProduct(tenantId: string, productId: string) {
    const product = await this.productsRepo.findOne({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Ürün bulunamadı');
    await this.productsRepo.remove(product);
    return { ok: true };
  }
}
