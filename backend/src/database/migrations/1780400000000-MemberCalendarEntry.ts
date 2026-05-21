import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Üye kişisel takvim kaydı tablosu.
 * Platform verileri (reservation, event_registration) ayrı — burası üyenin kendi planları.
 */
export class MemberCalendarEntry1780400000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "member_calendar_entry" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "title" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "date" DATE NOT NULL,
        "start_time" VARCHAR(5),
        "end_time" VARCHAR(5),
        "category" VARCHAR(30) NOT NULL DEFAULT 'personal',
        "color" VARCHAR(7) NOT NULL DEFAULT '#f59e0b',
        "completed" BOOLEAN NOT NULL DEFAULT FALSE,
        "recurring_rule" JSONB,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await qr.query(`
      CREATE INDEX "IDX_member_calendar_entry_user_date"
        ON "member_calendar_entry" ("user_id", "date");
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "member_calendar_entry"`);
  }
}
