import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConnectionRequest } from '../database/entities/connection-request.entity';
import { Trainer } from '../database/entities/trainer.entity';
import { TrainerMemberLink } from '../database/entities/trainer-member-link.entity';
import { User } from '../database/entities/user.entity';
import { Tenant } from '../database/entities/tenant.entity';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConnectionRequest, Trainer, TrainerMemberLink, User, Tenant]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
