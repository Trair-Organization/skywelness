import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kulüp yorumları tablosu.
 * Üyeler kulüplere 1-5 yıldız puan + opsiyonel yorum bırakabilir.
 * Bir kullanıcı aynı kulübe yalnızca bir kez yorum yapabilir.
 */
export class ClubReviews1779000000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "club_review" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "tenant_id" UUID NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "rating" INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await qr.query(`
      CREATE UNIQUE INDEX "UQ_club_review_tenant_user"
        ON "club_review" ("tenant_id", "user_id");
    `);

    await qr.query(`
      CREATE INDEX "IDX_club_review_tenant_rating"
        ON "club_review" ("tenant_id", "rating");
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "club_review"`);
  }
}
