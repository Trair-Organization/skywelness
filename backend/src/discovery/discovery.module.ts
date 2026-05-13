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
import { DiscoveryController } from './discovery.controller';
import { HomeBannersController } from './home-banners.controller';
import { DiscoveryService } from './discovery.service';

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
    ]),
    AuthModule,
  ],
  controllers: [DiscoveryController, HomeBannersController],
  providers: [DiscoveryService],
})
export class DiscoveryModule {}
