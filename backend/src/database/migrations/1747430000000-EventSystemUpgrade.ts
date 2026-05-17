import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventSystemUpgrade1747430000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // club_event new columns
    await queryRunner.query(`ALTER TABLE "club_event" ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) DEFAULT 'draft'`);
    await queryRunner.query(`ALTER TABLE "club_event" ADD COLUMN IF NOT EXISTS "created_by_user_id" UUID`);
    await queryRunner.query(`ALTER TABLE "club_event" ADD COLUMN IF NOT EXISTS "recurring_rule" JSONB`);
    await queryRunner.query(`ALTER TABLE "club_event" ADD COLUMN IF NOT EXISTS "parent_event_id" UUID`);

    // Set existing published events to 'approved' status
    await queryRunner.query(`UPDATE "club_event" SET status = 'approved' WHERE published = true AND status = 'draft'`);

    // club_event_registration new columns
    await queryRunner.query(`ALTER TABLE "club_event_registration" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) DEFAULT 'free'`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" ADD COLUMN IF NOT EXISTS "deposit_amount" NUMERIC(10,2) DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" ADD COLUMN IF NOT EXISTS "checked_in" BOOLEAN DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" ADD COLUMN IF NOT EXISTS "checked_in_at" TIMESTAMPTZ`);

    // event_waiting_list table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_waiting_list" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "club_event_id" UUID NOT NULL REFERENCES "club_event"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "status" VARCHAR(20) DEFAULT 'active',
        "position" INT DEFAULT 0,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("club_event_id", "user_id")
      )
    `);

    // event_review table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_review" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "club_event_id" UUID NOT NULL REFERENCES "club_event"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "rating" INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("club_event_id", "user_id")
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_club_event_status" ON "club_event" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_club_event_created_by" ON "club_event" ("created_by_user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_event_registration_payment" ON "club_event_registration" ("payment_status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_event_registration_payment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_club_event_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_club_event_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_review"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_waiting_list"`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" DROP COLUMN IF EXISTS "checked_in_at"`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" DROP COLUMN IF EXISTS "checked_in"`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" DROP COLUMN IF EXISTS "deposit_amount"`);
    await queryRunner.query(`ALTER TABLE "club_event_registration" DROP COLUMN IF EXISTS "payment_status"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "parent_event_id"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "recurring_rule"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "created_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "status"`);
  }
}
