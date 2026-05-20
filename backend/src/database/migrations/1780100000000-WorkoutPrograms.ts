import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Antrenman programları:
 * - trainer_workout_program: program şablonları (eğitmenin oluşturduğu)
 * - trainer_member_program: öğrenciye atanmış programlar
 *
 * Program "exercises" jsonb dizisi olarak saklanır:
 *   [{ name, sets, reps, weight, restSec, notes, videoUrl, imageUrl }, ...]
 * Bu sayede yapılandırma esnek, ileride yeni alan eklemek migration gerektirmez.
 */
export class WorkoutPrograms1780100000000 implements MigrationInterface {
  name = 'WorkoutPrograms1780100000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_workout_program" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "name" varchar(200) NOT NULL,
        "description" text,
        "category" varchar(32) NOT NULL DEFAULT 'general',
        "duration_weeks" int,
        "frequency_per_week" int,
        "exercises" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_workout_program" PRIMARY KEY ("id"),
        CONSTRAINT "FK_twp_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_twp_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX "IDX_twp_trainer" ON "trainer_workout_program" ("trainer_id")
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_member_program" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "program_id" uuid,
        "name" varchar(200) NOT NULL,
        "description" text,
        "exercises" jsonb NOT NULL DEFAULT '[]',
        "start_date" date NOT NULL,
        "end_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_program" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tmpr_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmpr_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmpr_member" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmpr_program" FOREIGN KEY ("program_id") REFERENCES "trainer_workout_program"("id") ON DELETE SET NULL
      )
    `);
    await qr.query(`
      CREATE INDEX "IDX_tmpr_member" ON "trainer_member_program" ("trainer_id", "member_user_id", "status")
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "trainer_member_program" CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS "trainer_workout_program" CASCADE`);
  }
}
