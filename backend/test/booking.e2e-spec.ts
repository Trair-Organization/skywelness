import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

type LoginResBody = { accessToken: string };
type TrainerRow = { id: string };
type SlotRow = { id: string; remainingCapacity: number };
type ReservationResBody = {
  id: string;
  status: string;
  package: { remainingSessions: number };
};
type NotificationRow = {
  id: string;
  type: string;
  isRead: boolean;
};

describe('Booking (e2e)', () => {
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

  it('member lists trainers, availability, books and cancels', async () => {
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM reservation WHERE user_id = $1::uuid AND tenant_id = $2::uuid`,
      ['00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001'],
    );
    await dataSource.query(
      `UPDATE time_slot SET booked_count = (
        SELECT COUNT(*)::int
        FROM reservation r
        WHERE r.time_slot_id = time_slot.id
          AND r.status IN ('pending', 'confirmed')
      )`,
    );

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'member@e2e.demo',
        password: 'Member123!',
        tenantSubdomain: 'demo',
      })
      .expect(201);

    const loginBody = login.body as LoginResBody;
    const token = loginBody.accessToken;
    expect(token).toBeDefined();

    const myPackages = await request(app.getHttpServer())
      .get('/api/v1/my-packages')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(myPackages.body)).toBe(true);
    expect((myPackages.body as { id: string }[]).length).toBeGreaterThanOrEqual(1);

    const trainers = await request(app.getHttpServer())
      .get('/api/v1/trainers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const trainerRows = trainers.body as TrainerRow[];
    expect(trainerRows.length).toBeGreaterThanOrEqual(1);
    const trainerId = trainerRows[0].id;

    const from = new Date();
    const to = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const availability = await request(app.getHttpServer())
      .get('/api/v1/availability')
      .query({
        trainerId,
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const slots = availability.body as SlotRow[];
    expect(slots.length).toBeGreaterThanOrEqual(1);
    const slot = slots.find((s) => s.remainingCapacity > 0);
    if (!slot) {
      throw new Error('expected a bookable slot');
    }

    const created = await request(app.getHttpServer())
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        timeSlotId: slot.id,
        packageId: '00000000-0000-4000-8000-000000000032',
      })
      .expect(201);

    const createdBody = created.body as ReservationResBody;
    expect(createdBody.status).toBe('confirmed');
    expect(createdBody.package.remainingSessions).toBe(4);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/reservations/${createdBody.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const cancelledBody = cancelled.body as ReservationResBody;
    expect(cancelledBody.status).toBe('cancelled');
    expect(cancelledBody.package.remainingSessions).toBe(5);

    const notifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const rows = notifications.body as NotificationRow[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const unread = rows.find((x) => !x.isRead);
    if (unread) {
      await request(app.getHttpServer())
        .post(`/api/v1/notifications/${unread.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    }
  });

  it('rejects X-Tenant-Subdomain that does not match the session', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'member@e2e.demo',
        password: 'Member123!',
        tenantSubdomain: 'demo',
      })
      .expect(201);

    const token = (login.body as LoginResBody).accessToken;
    expect(token).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/v1/trainers')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Subdomain', 'demo')
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/trainers')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Subdomain', 'definitely-not-a-registered-tenant')
      .expect(403);
  });

  it('member joins waiting list on a full slot and cannot join twice', async () => {
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `DELETE FROM waiting_list WHERE time_slot_id = $1::uuid AND user_id = $2::uuid`,
      ['00000000-0000-4000-8000-000000000043', '00000000-0000-4000-8000-000000000021'],
    );
    await dataSource.query(
      `DELETE FROM reservation WHERE time_slot_id = $1::uuid AND user_id = $2::uuid`,
      ['00000000-0000-4000-8000-000000000043', '00000000-0000-4000-8000-000000000021'],
    );
    await dataSource.query(`UPDATE time_slot SET booked_count = capacity WHERE id = $1::uuid`, [
      '00000000-0000-4000-8000-000000000043',
    ]);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'member@e2e.demo',
        password: 'Member123!',
        tenantSubdomain: 'demo',
      })
      .expect(201);
    const token = (login.body as LoginResBody).accessToken;

    const fullSlotId = '00000000-0000-4000-8000-000000000043';

    const joined = await request(app.getHttpServer())
      .post('/api/v1/waiting-list/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ timeSlotId: fullSlotId })
      .expect(201);
    expect((joined.body as { position: number }).position).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .post('/api/v1/waiting-list/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ timeSlotId: fullSlotId })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/waiting-list/join')
      .set('Authorization', `Bearer ${token}`)
      .send({ timeSlotId: '00000000-0000-4000-8000-000000000042' })
      .expect(400);
  });
});
