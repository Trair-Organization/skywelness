import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import type { CreateCampaignDto } from './dto/create-campaign.dto';
import type { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignsRepo: Repository<Campaign>,
  ) {}

  /** Üyelere gösterilecek aktif kampanyalar (tenant bazlı veya tüm platformda). */
  async listActive(tenantId?: string, limit = 10): Promise<Campaign[]> {
    const now = new Date();
    const where: Record<string, unknown> = {
      status: 'active',
      startsAt: LessThanOrEqual(now),
      endsAt: MoreThanOrEqual(now),
    };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.campaignsRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 20),
      relations: ['tenant'],
    });
  }

  /** Keşif ekranı: Sadece platform admin tarafından öne çıkarılmış kampanyalar. */
  async listFeatured(limit = 6): Promise<Campaign[]> {
    const now = new Date();
    return this.campaignsRepo.find({
      where: {
        featured: true,
        status: 'active',
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThanOrEqual(now),
      },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 10),
      relations: ['tenant'],
    });
  }

  /** Tüm platformdaki aktif kampanyalar (onboarding/keşif ekranı için). */
  async listAllActive(limit = 10): Promise<Campaign[]> {
    const now = new Date();
    return this.campaignsRepo.find({
      where: {
        status: 'active',
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThanOrEqual(now),
      },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 20),
      relations: ['tenant'],
    });
  }

  /** Admin: Kendi tenant'ının kampanyalarını listele. */
  async listByTenant(tenantId: string): Promise<Campaign[]> {
    return this.campaignsRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Admin: Kampanya oluştur. */
  async create(tenantId: string, dto: CreateCampaignDto): Promise<Campaign> {
    const campaign = this.campaignsRepo.create({
      tenantId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      campaignType: dto.campaignType,
      status: dto.status ?? 'active',
      discountKind: dto.discountKind,
      discountValue: String(dto.discountValue),
      imageUrl: dto.imageUrl?.trim() || null,
      audience: dto.audience ?? 'everyone',
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      maxRedemptions: dto.maxRedemptions ?? null,
    });
    return this.campaignsRepo.save(campaign);
  }

  /** Admin: Kampanya güncelle. */
  async update(tenantId: string, campaignId: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const campaign = await this.campaignsRepo.findOne({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (dto.title !== undefined) campaign.title = dto.title.trim();
    if (dto.description !== undefined) campaign.description = dto.description?.trim() || null;
    if (dto.campaignType !== undefined) campaign.campaignType = dto.campaignType;
    if (dto.status !== undefined) campaign.status = dto.status;
    if (dto.discountKind !== undefined) campaign.discountKind = dto.discountKind;
    if (dto.discountValue !== undefined) campaign.discountValue = String(dto.discountValue);
    if (dto.imageUrl !== undefined) campaign.imageUrl = dto.imageUrl?.trim() || null;
    if (dto.audience !== undefined) campaign.audience = dto.audience;
    if (dto.startsAt !== undefined) campaign.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) campaign.endsAt = new Date(dto.endsAt);
    if (dto.maxRedemptions !== undefined) campaign.maxRedemptions = dto.maxRedemptions;
    if (dto.featured !== undefined) campaign.featured = dto.featured;
    return this.campaignsRepo.save(campaign);
  }

  /** Admin: Kampanya sil. */
  async remove(tenantId: string, campaignId: string): Promise<void> {
    const campaign = await this.campaignsRepo.findOne({
      where: { id: campaignId, tenantId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    await this.campaignsRepo.remove(campaign);
  }

  /** Kampanya tıklanma sayacı. */
  async incrementClick(campaignId: string): Promise<void> {
    await this.campaignsRepo.increment({ id: campaignId }, 'clickCount', 1);
  }

  /** Kampanya görüntülenme sayacı (batch). */
  async incrementViews(campaignIds: string[]): Promise<void> {
    if (!campaignIds.length) return;
    await this.campaignsRepo
      .createQueryBuilder()
      .update()
      .set({ viewCount: () => '"view_count" + 1' })
      .whereInIds(campaignIds)
      .execute();
  }

  /** Platform admin: Kampanyayı öne çıkar veya kaldır. */
  async setFeatured(campaignId: string, featured: boolean): Promise<Campaign> {
    const campaign = await this.campaignsRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    campaign.featured = featured;
    return this.campaignsRepo.save(campaign);
  }
}
