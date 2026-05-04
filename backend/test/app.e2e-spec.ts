import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
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
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/api/v1/').expect(200).expect('Wellness Club API');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
