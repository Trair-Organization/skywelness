import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * App Store 1.2 (User-Generated Content) gereksinimleri:
 * - user_block: kullanıcı engelleme
 * - message_report: mesaj/sohbet şikayet
 * - conversation.deleted_by_a/b: kullanıcı bazlı soft delete
 */
export class MessagingModeration1778660000000 implements MigrationInterface {
  name = 'MessagingModeration1778660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_block tablosu
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_block" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blocker_user_id" uuid NOT NULL,
        "blocked_user_id" uuid NOT NULL,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_block" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_block_blocker" FOREIGN KEY ("blocker_user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_block_blocked" FOREIGN KEY ("blocked_user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_block_unique" ON "user_block" ("blocker_user_id", "blocked_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_block_blocked" ON "user_block" ("blocked_user_id")`,
    );

    // message_report tablosu
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "message_report" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reporter_user_id" uuid NOT NULL,
        "reported_user_id" uuid NOT NULL,
        "conversation_id" uuid,
        "message_id" uuid,
        "category" varchar(30) NOT NULL,
        "description" text,
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "admin_note" text,
        "reviewed_by_user_id" uuid,
        "reviewed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message_report" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_report_reporter" FOREIGN KEY ("reporter_user_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_report_reported" FOREIGN KEY ("reported_user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_message_report_status_created" ON "message_report" ("status", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_message_report_reported" ON "message_report" ("reported_user_id")`,
    );

    // conversation: soft delete alanları
    await queryRunner.query(`
      ALTER TABLE "conversation"
        ADD COLUMN IF NOT EXISTS "deleted_by_a" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "deleted_by_b" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN IF EXISTS "deleted_by_b"`);
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN IF EXISTS "deleted_by_a"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_report_reported"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_report_status_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_report"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_block_blocked"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_block_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_block"`);
  }
}
