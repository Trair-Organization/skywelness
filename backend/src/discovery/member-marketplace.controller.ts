import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { Favorite } from '../database/entities/favorite.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { ClubReview } from '../database/entities/club-review.entity';
import { Membership } from '../database/entities/membership.entity';
import { PaymentTransaction } from '../database/entities/payment-transaction.entity';

/**
 * Marketplace üye endpoint'leri — favoriler, yorumlarım, üyeliklerim, ödeme geçmişi.
 */
@Controller('marketplace/me')
@UseGuards(JwtAuthGuard)
export class MemberMarketplaceController {
  constructor(
    @InjectRepository(Favorite) private readonly favRepo: Repository<Favorite>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(ClubReview) private readonly reviewsRepo: Repository<ClubReview>,
    @InjectRepository(Membership) private readonly membershipsRepo: Repository<Membership>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentsRepo: Repository<PaymentTransaction>,
  ) {}

  // ═══ FAVORİLER ═══════════════════════════════════════════════════════════════

  /** Favorileri listele */
  @Get('favorites')
  async listFavorites(@CurrentUser() user: User) {
    const favs = await this.favRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    // Zenginleştir: kulüp ve eğitmen bilgilerini ekle
    const clubIds = favs.filter((f) => f.targetType === 'club').map((f) => f.targetId);
    const trainerIds = favs.filter((f) => f.targetType === 'trainer').map((f) => f.targetId);

    const clubs =
      clubIds.length > 0
        ? await this.tenantsRepo
            .createQueryBuilder('t')
            .where('t.id IN (:...ids)', { ids: clubIds })
            .getMany()
        : [];
    const trainers =
      trainerIds.length > 0
        ? await this.trainersRepo
            .createQueryBuilder('tr')
            .leftJoinAndSelect('tr.user', 'u')
            .where('tr.id IN (:...ids)', { ids: trainerIds })
            .getMany()
        : [];

    return favs.map((f) => {
      if (f.targetType === 'club') {
        const club = clubs.find((c) => c.id === f.targetId);
        return {
          id: f.id,
          type: 'club',
          targetId: f.targetId,
          createdAt: f.createdAt,
          club: club
            ? {
                name: club.name,
                subdomain: club.subdomain,
                logoUrl: club.logoUrl,
                coverImageUrl: club.coverImageUrl,
                location: club.location,
                avgRating: club.avgRating,
                services: club.services,
              }
            : null,
        };
      } else {
        const trainer = trainers.find((t) => t.id === f.targetId);
        return {
          id: f.id,
          type: 'trainer',
          targetId: f.targetId,
          createdAt: f.createdAt,
          trainer: trainer
            ? {
                id: trainer.id,
                name: `${trainer.user.firstName} ${trainer.user.lastName}`.trim(),
                photoUrl: trainer.photoUrl ?? trainer.user.photoUrl,
                avgRating: trainer.avgRating,
                totalSessions: trainer.totalSessions,
              }
            : null,
        };
      }
    });
  }

  /** Favorilere ekle */
  @Post('favorites')
  async addFavorite(
    @CurrentUser() user: User,
    @Body() body: { targetType: 'club' | 'trainer'; targetId: string },
  ) {
    if (!['club', 'trainer'].includes(body.targetType)) {
      throw new NotFoundException('Geçersiz favori tipi');
    }

    const existing = await this.favRepo.findOne({
      where: { userId: user.id, targetType: body.targetType, targetId: body.targetId },
    });
    if (existing) throw new ConflictException('Zaten favorilerde');

    const fav = this.favRepo.create({
      userId: user.id,
      targetType: body.targetType,
      targetId: body.targetId,
    });
    await this.favRepo.save(fav);
    return { success: true, id: fav.id };
  }

  /** Favoriden kaldır */
  @Delete('favorites/:id')
  async removeFavorite(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const fav = await this.favRepo.findOne({ where: { id, userId: user.id } });
    if (!fav) throw new NotFoundException('Favori bulunamadı');
    await this.favRepo.remove(fav);
    return { success: true };
  }

  /** Favori durumu kontrol (bir kulüp/eğitmen favoride mi?) */
  @Get('favorites/check')
  async checkFavorite(
    @CurrentUser() user: User,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
  ) {
    const fav = await this.favRepo.findOne({
      where: { userId: user.id, targetType: targetType as 'club' | 'trainer', targetId },
    });
    return { isFavorite: !!fav, favoriteId: fav?.id ?? null };
  }

  // ═══ DEĞERLENDİRMELERİM ════════════════════════════════════════════════════

  /** Yazdığım tüm kulüp yorumları */
  @Get('reviews')
  async myReviews(@CurrentUser() user: User) {
    const reviews = await this.reviewsRepo.find({
      where: { userId: user.id },
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      club: {
        name: r.tenant.name,
        subdomain: r.tenant.subdomain,
        logoUrl: r.tenant.logoUrl,
      },
    }));
  }

  // ═══ ÜYELİKLERİM ═══════════════════════════════════════════════════════════

  /** Kulüp üyeliklerim */
  @Get('memberships')
  async myMemberships(@CurrentUser() user: User) {
    const memberships = await this.membershipsRepo.find({
      where: { userId: user.id },
      relations: ['tenant'],
      order: { createdAt: 'DESC' },
    });

    return memberships.map((m) => ({
      id: m.id,
      membershipType: m.membershipType,
      startDate: m.startDate,
      endDate: m.endDate,
      status: m.status,
      price: m.price,
      currency: m.currency,
      club: {
        name: m.tenant.name,
        subdomain: m.tenant.subdomain,
        logoUrl: m.tenant.logoUrl,
        location: m.tenant.location,
      },
    }));
  }

  // ═══ ÖDEME GEÇMİŞİ ════════════════════════════════════════════════════════

  /** Ödeme geçmişim */
  @Get('payments')
  async myPayments(@CurrentUser() user: User, @Query('limit') limit?: string) {
    const payments = await this.paymentsRepo.find({
      where: { userId: user.id },
      relations: ['package', 'package.packageType'],
      order: { createdAt: 'DESC' },
      take: Math.min(Number(limit) || 20, 50),
    });

    return payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      discountAmount: p.discountAmount,
      currency: p.currency,
      status: p.status,
      receiptUrl: p.receiptUrl,
      createdAt: p.createdAt,
      package: p.package
        ? {
            name: p.package.packageType?.name ?? 'Paket',
            sessionType: p.package.packageType?.sessionType ?? null,
          }
        : null,
    }));
  }
}
