import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eğitmen ve öğrenci paylaşılan hedefler.
 * - Eğitmen tarafından oluşturulur
 * - Öğrenci kendi profilinde görür
 * - İlerleme yüzdesi takip edilir
 * - Bitiş tarihi ile zaman planı yapılır
 */
export class StudentGoals1779900000000 implements MigrationInterface {
  name = 'StudentGoals1779900000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_member_goal" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "category" varchar(32) NOT NULL DEFAULT 'general',
        "target_value" numeric(10,2),
        "target_unit" varchar(16),
        "start_value" numeric(10,2),
        "current_value" numeric(10,2),
        "start_date" date NOT NULL,
        "target_date" date,
        "completed_at" date,
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_goal" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tmg_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmg_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmg_member" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX "IDX_tmg_trainer_member" ON "trainer_member_goal" ("trainer_id", "member_user_id", "status")
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "trainer_member_goal" CASCADE`);
  }
}
