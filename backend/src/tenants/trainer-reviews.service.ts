import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainerReview } from '../database/entities/trainer-review.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { User } from '../database/entities/user.entity';
import { Reservation } from '../database/entities/reservation.entity';
import { ReservationStatus } from '../database/enums';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_ID_RE = /^[A-Z]{3}-[A-Z0-9]+$/i;

@Injectable()
export class TrainerReviewsService {
  constructor(
    @InjectRepository(TrainerReview) private readonly reviewsRepo: Repository<TrainerReview>,
    @InjectRepository(Trainer) private readonly trainersRepo: Repository<Trainer>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Reservation) private readonly resRepo: Repository<Reservation>,
  ) {}

  /** slug/publicId/uuid → Trainer */
  private async resolveTrainer(slugOrId: string): Promise<Trainer> {
    let trainer: Trainer | null = null;
    if (UUID_RE.test(slugOrId)) {
      trainer = await this.trainersRepo.findOne({ where: { id: slugOrId } });
    } else if (PUBLIC_ID_RE.test(slugOrId)) {
      const user = await this.usersRepo.findOne({
        where: { publicId: slugOrId.toUpperCase() },
      });
      if (user) trainer = await this.trainersRepo.findOne({ where: { userId: user.id } });
    } else {
      const user = await this.usersRepo.findOne({ where: { slug: slugOrId.toLowerCase() } });
      if (user) trainer = await this.trainersRepo.findOne({ where: { userId: user.id } });
    }
    if (!trainer) throw new NotFoundException('Eğitmen bulunamadı');
    return trainer;
  }

  /** Public: eğitmenin yorumlarını listele */
  async listByTrainer(slugOrId: string, limit = 20, offset = 0) {
    const trainer = await this.resolveTrainer(slugOrId);

    const [reviews, total] = await this.reviewsRepo.findAndCount({
      where: { trainerId: trainer.id },
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
          lastName: r.user.lastName?.charAt(0)
            ? r.user.lastName.charAt(0).toUpperCase() + '.'
            : '',
          photoUrl: r.user.photoUrl,
        },
      })),
      total,
      avgRating: trainer.avgRating,
      reviewCount: trainer.reviewCount ?? 0,
    };
  }

  /** Auth: Üye eğitmene yorum bırakır (en az 1 tamamlanmış ders şartı) */
  async createReview(userId: string, slugOrId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) throw new BadRequestException('Puan 1-5 arasında olmalı');

    const trainer = await this.resolveTrainer(slugOrId);

    // Kendine yorum yapılamaz
    if (trainer.userId === userId) {
      throw new ForbiddenException('Kendinize yorum yapamazsınız');
    }

    // En az 1 tamamlanmış ders şartı
    const completedCount = await this.resRepo.count({
      where: {
        trainerId: trainer.id,
        userId,
        status: ReservationStatus.COMPLETED,
      },
    });
    if (completedCount === 0) {
      throw new ForbiddenException(
        'Yorum bırakmak için bu eğitmenle en az bir tamamlanmış dersiniz olmalı',
      );
    }

    // Aynı eğitmene tekrar yorum yapılamaz
    const existing = await this.reviewsRepo.findOne({
      where: { trainerId: trainer.id, userId },
    });
    if (existing) throw new ConflictException('Bu eğitmene zaten yorum yapmışsınız');

    const review = this.reviewsRepo.create({
      trainerId: trainer.id,
      userId,
      rating,
      comment: comment?.trim() || null,
    });
    await this.reviewsRepo.save(review);

    await this.recalculateRating(trainer.id);

    return { success: true, reviewId: review.id };
  }

  /** Auth: Üye kendi yorumunu siler */
  async deleteReview(userId: string, reviewId: string) {
    const review = await this.reviewsRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Yorum bulunamadı');
    if (review.userId !== userId) throw new ForbiddenException('Bu yorumu silemezsiniz');

    const trainerId = review.trainerId;
    await this.reviewsRepo.remove(review);
    await this.recalculateRating(trainerId);
    return { success: true };
  }

  /** Trainer için ortalama + sayıyı yeniden hesapla */
  private async recalculateRating(trainerId: string) {
    const result = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.trainerId = :trainerId', { trainerId })
      .getRawOne<{ avg: string | null; count: string }>();

    const avg = result?.avg ? parseFloat(result.avg).toFixed(2) : '0.00';
    const count = result?.count ? parseInt(result.count, 10) : 0;

    await this.trainersRepo.update(trainerId, {
      avgRating: avg,
      reviewCount: count,
    });
  }

  /** Yorum bırakabilir mi? (frontend butonunu açmak için) */
  async canReview(userId: string, slugOrId: string) {
    const trainer = await this.resolveTrainer(slugOrId);

    if (trainer.userId === userId) return { canReview: false, reason: 'self' };

    const existing = await this.reviewsRepo.findOne({
      where: { trainerId: trainer.id, userId },
    });
    if (existing) {
      return {
        canReview: false,
        reason: 'already',
        myReview: { id: existing.id, rating: existing.rating, comment: existing.comment },
      };
    }

    const completedCount = await this.resRepo.count({
      where: {
        trainerId: trainer.id,
        userId,
        status: ReservationStatus.COMPLETED,
      },
    });
    if (completedCount === 0) {
      return { canReview: false, reason: 'no_completed_lesson' };
    }

    return { canReview: true };
  }
}
