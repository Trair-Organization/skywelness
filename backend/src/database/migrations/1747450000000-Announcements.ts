import { MigrationInterface, QueryRunner } from 'typeorm';

export class Announcements1747450000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "announcement" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
        "created_by_user_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
        "title" VARCHAR(200) NOT NULL,
        "content" TEXT NOT NULL,
        "target" VARCHAR(20) DEFAULT 'all',
        "recipient_count" INT DEFAULT 0,
        "read_count" INT DEFAULT 0,
        "push_sent" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_announcement_tenant" ON "announcement" ("tenant_id", "created_at" DESC)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "announcement_read" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "announcement_id" UUID NOT NULL REFERENCES "announcement"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "read_at" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("announcement_id", "user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "announcement_read"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_announcement_tenant"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "announcement"`);
  }
}
