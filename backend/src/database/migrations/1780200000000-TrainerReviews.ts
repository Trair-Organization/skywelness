import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eğitmen yorumları tablosu.
 * Üyeler eğitmenlere 1-5 yıldız puan + opsiyonel yorum bırakabilir.
 * Bir kullanıcı aynı eğitmene yalnızca bir kez yorum yapabilir.
 * Sadece tamamlanmış en az bir dersi olan üye yorum bırakabilir (servis seviyesinde kontrol).
 */
export class TrainerReviews1780200000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "trainer_review" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "trainer_id" UUID NOT NULL REFERENCES "trainer"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "rating" INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await qr.query(`
      CREATE UNIQUE INDEX "UQ_trainer_review_trainer_user"
        ON "trainer_review" ("trainer_id", "user_id");
    `);

    await qr.query(`
      CREATE INDEX "IDX_trainer_review_trainer_rating"
        ON "trainer_review" ("trainer_id", "rating");
    `);

    // review_count kolonu yoksa trainer tablosuna ekle
    await qr.query(`
      ALTER TABLE "trainer"
      ADD COLUMN IF NOT EXISTS "review_count" INT NOT NULL DEFAULT 0;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "trainer_review"`);
    await qr.query(`ALTER TABLE "trainer" DROP COLUMN IF EXISTS "review_count";`);
  }
}
