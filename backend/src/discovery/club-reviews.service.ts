import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubReview } from '../database/entities/club-review.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { User } from '../database/entities/user.entity';

@Injectable()
export class ClubReviewsService {
  constructor(
    @InjectRepository(ClubReview) private readonly reviewsRepo: Repository<ClubReview>,
    @InjectRepository(Tenant) private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  /** Public: Kulübün yorumlarını listele */
  async listByClub(subdomain: string, limit = 20, offset = 0) {
    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Kulüp bulunamadı');

    const [reviews, total] = await this.reviewsRepo.findAndCount({
      where: { tenantId: tenant.id },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 50),
      skip: offset,
    });

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        user: {
          firstName: r.user.firstName,
          lastName: r.user.lastName?.charAt(0) ? r.user.lastName.charAt(0) + '.' : '',
          photoUrl: r.user.photoUrl,
        },
      })),
      total,
      avgRating: tenant.avgRating,
      reviewCount: tenant.reviewCount,
    };
  }

  /** Auth: Yorum bırak */
  async createReview(userId: string, subdomain: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Puan 1-5 arasında olmalı');

    const tenant = await this.tenantsRepo.findOne({ where: { subdomain } });
    if (!tenant) throw new NotFoundException('Kulüp bulunamadı');

    // Aynı kulübe tekrar yorum yapılamaz
    const existing = await this.reviewsRepo.findOne({
      where: { tenantId: tenant.id, userId },
    });
    if (existing) throw new ConflictException('Bu kulübe zaten yorum yapmışsınız');

    const review = this.reviewsRepo.create({
      tenantId: tenant.id,
      userId,
      rating,
      comment: comment?.trim() || null,
    });
    await this.reviewsRepo.save(review);

    // Rating güncelle
    await this.recalculateRating(tenant.id);

    return { success: true, reviewId: review.id };
  }

  /** Ortalama puanı yeniden hesapla */
  private async recalculateRating(tenantId: string) {
    const result = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.tenantId = :tenantId', { tenantId })
      .getRawOne<{ avg: string | null; count: string }>();

    const avg = result?.avg ? parseFloat(result.avg).toFixed(2) : '0.00';
    const count = result?.count ? parseInt(result.count, 10) : 0;

    await this.tenantsRepo.update(tenantId, {
      avgRating: avg,
      reviewCount: count,
    });
  }
}
