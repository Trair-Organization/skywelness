import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

type TokenPair = { accessToken: string; refreshToken: string };

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET =
      process.env.JWT_ACCESS_SECRET ?? 'e2e-test-jwt-secret-minimum-32-chars-long!!';
    process.env.JWT_REFRESH_SECRET =
      process.env.JWT_REFRESH_SECRET ?? 'e2e-test-refresh-secret-32-chars-min!!';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://rezidans:rezidans_dev_pass@127.0.0.1:5432/rezidans_dev';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('refresh returns new tokens; logout revokes refresh', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'member@e2e.demo',
        password: 'Member123!',
        tenantSubdomain: 'demo',
      })
      .expect(201);

    const loginBody = login.body as TokenPair;
    expect(loginBody.refreshToken).toBeDefined();

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: loginBody.refreshToken })
      .expect(200);

    const refreshedBody = refreshed.body as TokenPair;
    expect(refreshedBody.accessToken).toBeDefined();
    expect(refreshedBody.refreshToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${refreshedBody.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshedBody.refreshToken })
      .expect(401);
  });

  it('forgot-password and reset-password update credentials', async () => {
    const dataSource = app.get(DataSource);
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({
        email: 'admin@e2e.demo',
        tenantSubdomain: 'demo',
      })
      .expect(200);

    const token = 'e2e-reset-token-1234567890';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await dataSource.query(
      `UPDATE "user"
       SET reset_password_token_hash = $1::varchar,
           reset_password_expires_at = NOW() + interval '30 minutes'
       WHERE email = $2::varchar AND tenant_id = $3::uuid`,
      [tokenHash, 'admin@e2e.demo', '00000000-0000-4000-8000-000000000001'],
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, newPassword: 'Admin456!' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@e2e.demo',
        password: 'Admin456!',
        tenantSubdomain: 'demo',
      })
      .expect(201);
  });
});
