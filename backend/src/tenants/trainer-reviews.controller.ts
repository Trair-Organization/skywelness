import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { TrainerReviewsService } from './trainer-reviews.service';

@Controller('trainers')
export class TrainerReviewsController {
  constructor(private readonly service: TrainerReviewsService) {}

  /** Public: Eğitmen yorumlarını listele */
  @SkipThrottle()
  @Get(':slug/reviews')
  listReviews(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listByTrainer(slug.trim(), Number(limit) || 20, Number(offset) || 0);
  }

  /** Auth: Yorum bırakabilir mi? */
  @UseGuards(JwtAuthGuard)
  @Get(':slug/reviews/can-review')
  canReview(@CurrentUser() user: User, @Param('slug') slug: string) {
    return this.service.canReview(user.id, slug.trim());
  }

  /** Auth: Yorum bırak */
  @UseGuards(JwtAuthGuard)
  @Post(':slug/reviews')
  createReview(
    @CurrentUser() user: User,
    @Param('slug') slug: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.service.createReview(user.id, slug.trim(), body.rating, body.comment);
  }

  /** Auth: Kendi yorumunu sil */
  @UseGuards(JwtAuthGuard)
  @Delete('reviews/:reviewId')
  deleteReview(@CurrentUser() user: User, @Param('reviewId') reviewId: string) {
    return this.service.deleteReview(user.id, reviewId);
  }
}
