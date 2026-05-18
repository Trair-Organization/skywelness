import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Tenant } from '../database/entities/tenant.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerProfile } from '../database/entities/trainer-profile.entity';
import { TrainerApplication } from '../database/entities/trainer-application.entity';
import { ClubEvent } from '../database/entities/club-event.entity';
import { User } from '../database/entities/user.entity';
import { HomeBanner } from '../database/entities/home-banner.entity';
import { ClubReview } from '../database/entities/club-review.entity';
import { Favorite } from '../database/entities/favorite.entity';
import { Membership } from '../database/entities/membership.entity';
import { PaymentTransaction } from '../database/entities/payment-transaction.entity';
import { DiscoveryController } from './discovery.controller';
import { HomeBannersController } from './home-banners.controller';
import { ClubReviewsController } from './club-reviews.controller';
import { MemberMarketplaceController } from './member-marketplace.controller';
import { DiscoveryService } from './discovery.service';
import { ClubReviewsService } from './club-reviews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Trainer,
      TrainerProfile,
      TrainerApplication,
      ClubEvent,
      User,
      HomeBanner,
      ClubReview,
      Favorite,
      Membership,
      PaymentTransaction,
    ]),
    AuthModule,
  ],
  controllers: [
    DiscoveryController,
    HomeBannersController,
    ClubReviewsController,
    MemberMarketplaceController,
  ],
  providers: [DiscoveryService, ClubReviewsService],
})
export class DiscoveryModule {}
