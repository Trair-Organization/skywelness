import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { AppController } from './app.controller';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { TenantsModule } from './tenants/tenants.module';
import { AppService } from './app.service';
import { typeOrmEntities } from './database/typeorm-entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), join(__dirname, '..', '..', '.env')],
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
    BookingModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor }],
})
export class AppModule {}
