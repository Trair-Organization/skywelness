import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partner Badge Sistemi
 *
 * Hem tenant (kulüp) hem user (eğitmen) için manuel atanabilen
 * badge'ler için text array kolonu. Otomatik hesaplanan badge'ler
 * (verified, new, top-rated) BadgeService'te runtime'da hesaplanıyor;
 * burası manuel override ve özel badge'ler için.
 *
 * Olası badge anahtarları:
 *   - 'verified', 'premium', 'elite', 'new'  (tier)
 *   - 'top-rated', 'trending', 'fast-response', 'satisfaction'  (perf)
 *   - 'certified', 'expert', 'top-trainer'  (trainer)
 *   - 'multi-service', 'large-community', 'multi-branch'  (club)
 *   - 'has-campaign', 'open-now', 'instant-booking'  (etkinlik)
 */
export class PartnerBadges1779500000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // Tenant badges kolonu
    await qr.query(`
      ALTER TABLE tenant
      ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}'
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_badges
      ON tenant USING gin(badges)
    `);

    // User badges kolonu (eğitmen için kullanılır)
    await qr.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}'
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_user_badges
      ON "user" USING gin(badges)
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_tenant_badges`);
    await qr.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS badges`);
    await qr.query(`DROP INDEX IF EXISTS idx_user_badges`);
    await qr.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS badges`);
  }
}
