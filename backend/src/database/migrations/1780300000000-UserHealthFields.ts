import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User tablosuna sağlık/profil alanları:
 * - birthDate: yaş hesaplaması için
 * - gender: antrenman planlamasında bilgi amaçlı
 * - healthNotes: yaralanma geçmişi, kronik rahatsızlık (sadece eğitmen görür)
 */
export class UserHealthFields1780300000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "birth_date" DATE,
      ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "health_notes" TEXT;
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "birth_date",
      DROP COLUMN IF EXISTS "gender",
      DROP COLUMN IF EXISTS "health_notes";
    `);
  }
}
