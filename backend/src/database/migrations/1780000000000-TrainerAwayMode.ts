import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eğitmen "Tatildeyim" / "Müsait Değilim" modu.
 * - away_until: tatil bitiş tarihi (NULL ise aktif)
 * - away_message: üyelere/keşfe gösterilen mesaj
 * - verified: sertifika doğrulanmış mı (super admin onaylar)
 */
export class TrainerAwayMode1780000000000 implements MigrationInterface {
  name = 'TrainerAwayMode1780000000000';

  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "trainer"
        ADD COLUMN IF NOT EXISTS "away_until" date,
        ADD COLUMN IF NOT EXISTS "away_message" text,
        ADD COLUMN IF NOT EXISTS "verified" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "trainer"
        DROP COLUMN IF EXISTS "away_until",
        DROP COLUMN IF EXISTS "away_message",
        DROP COLUMN IF EXISTS "verified"
    `);
  }
}
