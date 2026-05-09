import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { EventsModule } from './events/events.module';
import { MessagingModule } from './messaging/messaging.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { PlatformAdminModule } from './platform-admin/platform-admin.module';
import { TenantsModule } from './tenants/tenants.module';
import { AppService } from './app.service';
import { typeOrmEntities } from './database/typeorm-entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), join(__dirname, '..', '..', '.env')],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('NODE_ENV') === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
            // Health check endpoint'lerini loglamayı atla (gürültü azaltma)
            autoLogging: {
              ignore: (req: { url?: string }) => req.url?.startsWith('/api/v1/health') ?? false,
            },
          },
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.get<string>('DATABASE_URL'),
        entities: typeOrmEntities,
        migrations: [join(__dirname, 'database', 'migrations', '*.js')],
        migrationsRun:
          configService.get<string>('TYPEORM_RUN_MIGRATIONS_ON_STARTUP', 'false') === 'true',
        namingStrategy: new SnakeNamingStrategy(),
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    TenantsModule,
    AdminModule,
    PlatformAdminModule,
    BookingModule,
    CampaignsModule,
    DiscoveryModule,
    EventsModule,
    MessagingModule,
    HealthModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 dakika
        limit: 120, // varsayılan IP başına 120 req/dk
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
