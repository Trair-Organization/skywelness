import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Favori tablosu — kulüp/eğitmen beğenme.
 */
export class Favorites1779100000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS "favorite" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "target_type" VARCHAR(20) NOT NULL,
        "target_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await qr.query(`
      CREATE UNIQUE INDEX "UQ_favorite_user_target"
        ON "favorite" ("user_id", "target_type", "target_id");
    `);

    await qr.query(`
      CREATE INDEX "IDX_favorite_user"
        ON "favorite" ("user_id", "created_at" DESC);
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "favorite"`);
  }
}
