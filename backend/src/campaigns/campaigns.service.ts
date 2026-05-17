import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Campaign } from '../database/entities/campaign.entity';
import { PushService } from '../notifications/push.service';
import { User } from '../database/entities/user.entity';
import type { CreateCampaignDto } from './dto/create-campaign.dto';
import type { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignsRepo: Repository<Campaign>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly pushService: PushService,
  ) {}

  /** Public: Kulüp sayfasında gösterilecek kampanyalar (subdomain ile) */
  async listBySubdomain(subdomain: string, limit = 10): Promise<Campaign[]> {
    const now = new Date();
    return this.campaignsRepo.find({
      where: {
        status: 'active',
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThanOrEqual(now),
        tenant: { subdomain },
      },
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 20),
    });
  }

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
      originalPrice: dto.originalPrice != null ? String(dto.originalPrice) : null,
      discountedPrice: dto.discountedPrice != null ? String(dto.discountedPrice) : null,
      terms: dto.terms?.trim() || null,
      imageUrl: dto.imageUrl?.trim() || null,
      audience: dto.audience ?? 'everyone',
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      maxRedemptions: dto.maxRedemptions ?? null,
      targetCity: dto.targetCity?.trim() || null,
      targetDistrict: dto.targetDistrict?.trim() || null,
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
    if (dto.originalPrice !== undefined)
      campaign.originalPrice = dto.originalPrice != null ? String(dto.originalPrice) : null;
    if (dto.discountedPrice !== undefined)
      campaign.discountedPrice = dto.discountedPrice != null ? String(dto.discountedPrice) : null;
    if (dto.terms !== undefined) campaign.terms = dto.terms?.trim() || null;
    if (dto.imageUrl !== undefined) campaign.imageUrl = dto.imageUrl?.trim() || null;
    if (dto.audience !== undefined) campaign.audience = dto.audience;
    if (dto.startsAt !== undefined) campaign.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) campaign.endsAt = new Date(dto.endsAt);
    if (dto.maxRedemptions !== undefined) campaign.maxRedemptions = dto.maxRedemptions;
    if (dto.featured !== undefined) campaign.featured = dto.featured;
    if (dto.targetCity !== undefined) campaign.targetCity = dto.targetCity?.trim() || null;
    if (dto.targetDistrict !== undefined) campaign.targetDistrict = dto.targetDistrict?.trim() || null;
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

  /** Cron: Her saat süresi dolan kampanyaları expired yap */
  @Cron('0 0 * * * *')
  async expireCampaigns() {
    const now = new Date();
    // Find campaigns about to expire (still active but end time passed)
    const expiring = await this.campaignsRepo.find({
      where: { status: 'active', endsAt: LessThan(now) },
    });

    if (expiring.length === 0) return;

    // Mark them expired
    await this.campaignsRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'expired' })
      .where('status = :status', { status: 'active' })
      .andWhere('ends_at < :now', { now })
      .execute();

    // Notify admins
    for (const campaign of expiring) {
      const admins = await this.usersRepo.find({
        where: { tenantId: campaign.tenantId, role: 'administrator' as never },
        select: ['id'],
      });
      if (admins.length > 0) {
        void this.pushService.sendToMany(
          admins.map(a => a.id),
          '⌛ Kampanya Süresi Doldu',
          `"${campaign.title}" kampanyanızın süresi doldu.`,
          { type: 'campaign_expired', campaignId: campaign.id },
        );
      }
    }
    this.logger.log(`Expired ${expiring.length} campaigns`);
  }

  /** Kampanya başlatıldığında tenant üyelerine bildirim gönder */
  async notifyMembers(tenantId: string, campaign: Campaign) {
    const members = await this.usersRepo.find({
      where: { tenantId, role: 'member' as never, accountStatus: 'active' as never },
      select: ['id'],
    });
    if (members.length === 0) return { sent: 0, total: 0 };

    const userIds = members.map((m) => m.id);
    const discountText = campaign.discountKind === 'percentage'
      ? `%${campaign.discountValue} indirim`
      : `₺${campaign.discountValue} indirim`;

    return this.pushService.sendToMany(
      userIds,
      `🔥 ${campaign.title}`,
      `${discountText}! Son gün: ${campaign.endsAt.toLocaleDateString('tr-TR')}`,
      { type: 'campaign', campaignId: campaign.id },
    );
  }
}
