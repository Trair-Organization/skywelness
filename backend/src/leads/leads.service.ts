import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../database/entities/lead.entity';
import { Tenant } from '../database/entities/tenant.entity';
import type { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private readonly leadsRepo: Repository<Lead>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  /** Public: Yeni lead oluştur (keşif ekranından gelen talep). */
  async create(dto: CreateLeadDto): Promise<Lead> {
    let tenantId: string | null = null;
    if (dto.clubSubdomain) {
      const tenant = await this.tenantsRepo.findOne({ where: { subdomain: dto.clubSubdomain } });
      tenantId = tenant?.id ?? null;
    }

    const lead = this.leadsRepo.create({
      tenantId,
      name: dto.name.trim(),
      phone: dto.phone.trim(),
      email: dto.email?.trim() || null,
      message: dto.message?.trim() || null,
      source: dto.source,
      sourceRef: dto.sourceRef?.trim() || null,
      sourceLabel: dto.sourceLabel?.trim() || null,
      status: 'new',
    });
    return this.leadsRepo.save(lead);
  }

  /** Admin: Kendi tenant'ının lead'lerini listele. */
  async listByTenant(tenantId: string) {
    return this.leadsRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Platform admin: Tüm lead'ler. */
  async listAll(limit = 100) {
    return this.leadsRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['tenant'],
    });
  }

  /** Admin: Lead durumunu güncelle. */
  async updateStatus(leadId: string, status: string, adminNote?: string) {
    const lead = await this.leadsRepo.findOne({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead not found');
    lead.status = status as Lead['status'];
    if (adminNote !== undefined) lead.adminNote = adminNote?.trim() || null;
    return this.leadsRepo.save(lead);
  }
}
