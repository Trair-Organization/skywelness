import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Öğrenci detay sayfası için 3 tablo:
 *
 * 1. trainer_member_measurement  → Vücut ölçümleri (kilo, yağ %, çevre)
 * 2. trainer_member_assessment   → Değerlendirmeler (FMS, postür, VO2 max — JSON)
 * 3. trainer_member_photo        → Profil/ilerleme fotoğrafları (timeline)
 *
 * Hepsi trainer_id + member_user_id + tenant_id ile bağlı.
 * Eğitmen sadece kendi öğrencilerinin verilerini görür/düzenler.
 */
export class StudentDetailTables1779800000000 implements MigrationInterface {
  name = 'StudentDetailTables1779800000000';

  public async up(qr: QueryRunner): Promise<void> {
    // ─── 1. Ölçümler ──────────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_member_measurement" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "measured_at" date NOT NULL,
        "weight_kg" numeric(5,2),
        "height_cm" numeric(5,2),
        "body_fat_pct" numeric(4,1),
        "muscle_mass_kg" numeric(5,2),
        "waist_cm" numeric(5,1),
        "hip_cm" numeric(5,1),
        "chest_cm" numeric(5,1),
        "biceps_left_cm" numeric(4,1),
        "biceps_right_cm" numeric(4,1),
        "thigh_left_cm" numeric(4,1),
        "thigh_right_cm" numeric(4,1),
        "calf_left_cm" numeric(4,1),
        "calf_right_cm" numeric(4,1),
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_measurement" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tmm_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmm_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmm_member" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX "IDX_tmm_trainer_member" ON "trainer_member_measurement" ("trainer_id", "member_user_id", "measured_at" DESC)
    `);

    // ─── 2. Değerlendirmeler ──────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_member_assessment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "assessed_at" date NOT NULL,
        "type" varchar(32) NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_assessment" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tma_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tma_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tma_member" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX "IDX_tma_trainer_member" ON "trainer_member_assessment" ("trainer_id", "member_user_id", "assessed_at" DESC)
    `);
    await qr.query(`
      CREATE INDEX "IDX_tma_type" ON "trainer_member_assessment" ("type")
    `);

    // ─── 3. Fotoğraflar ──────────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_member_photo" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "taken_at" date NOT NULL,
        "photo_url" varchar(2048) NOT NULL,
        "tag" varchar(64),
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_photo" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tmp_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmp_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tmp_member" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await qr.query(`
      CREATE INDEX "IDX_tmp_trainer_member" ON "trainer_member_photo" ("trainer_id", "member_user_id", "taken_at" DESC)
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "trainer_member_photo" CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS "trainer_member_assessment" CASCADE`);
    await qr.query(`DROP TABLE IF EXISTS "trainer_member_measurement" CASCADE`);
  }
}
