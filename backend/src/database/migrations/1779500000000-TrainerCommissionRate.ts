import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eğitmen bazlı platform komisyonu.
 * Varsayılan %7 (0.070). Süper Admin panelinden eğitmen bazlı değiştirilebilir.
 *
 * Bu komisyon, eğitmenin kendi öğrencilerinden kazandığı ders ücretlerinden
 * platforma ödenen oran.
 */
export class TrainerCommissionRate1779500000000 implements MigrationInterface {
  name = 'TrainerCommissionRate1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trainer"
        ADD COLUMN IF NOT EXISTS "commission_rate" numeric(4,3) NOT NULL DEFAULT 0.070
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trainer" DROP COLUMN IF EXISTS "commission_rate"`);
  }
}
