import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
import { ClubReviewsService } from './club-reviews.service';

@Controller('clubs')
export class ClubReviewsController {
  constructor(private readonly service: ClubReviewsService) {}

  /** Public: Kulüp yorumlarını listele */
  @SkipThrottle()
  @Get(':subdomain/reviews')
  listReviews(
    @Param('subdomain') subdomain: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listByClub(
      subdomain.trim().toLowerCase(),
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  /** Auth: Yorum bırak */
  @UseGuards(JwtAuthGuard)
  @Post(':subdomain/reviews')
  createReview(
    @CurrentUser() user: User,
    @Param('subdomain') subdomain: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.service.createReview(
      user.id,
      subdomain.trim().toLowerCase(),
      body.rating,
      body.comment,
    );
  }
}
