import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../database/entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async findPublicBySubdomain(subdomain: string) {
    const normalized = subdomain.trim().toLowerCase();
    const tenant = await this.tenantsRepo.findOne({
      where: { subdomain: normalized },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      branding: tenant.branding,
    };
  }

  /** For tenant context validation (no 404 — unknown subdomain returns null). */
  async resolveIdBySubdomain(subdomain: string): Promise<string | null> {
    const normalized = subdomain.trim().toLowerCase();
    if (normalized.length < 2) {
      return null;
    }
    const row = await this.tenantsRepo.findOne({
      where: { subdomain: normalized },
      select: { id: true },
    });
    return row?.id ?? null;
  }
}
