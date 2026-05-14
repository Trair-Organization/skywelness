import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant bazlı dinamik komisyon oranı.
 * Varsayılan %15 (0.150). Süper Admin panelinden partner bazlı değiştirilebilir.
 */
export class TenantCommissionRate1778620000000 implements MigrationInterface {
  name = 'TenantCommissionRate1778620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant"
        ADD COLUMN IF NOT EXISTS "commission_rate" numeric(4,3) NOT NULL DEFAULT 0.150
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "commission_rate"`);
  }
}
