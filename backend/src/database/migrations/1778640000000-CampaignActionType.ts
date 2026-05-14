import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kampanyalara aksiyon tipi.
 * - instant_buy: Sadece direkt satın alma (Stripe)
 * - lead_only: Sadece bilgi formu
 * - both: İkisi birden (varsayılan)
 */
export class CampaignActionType1778640000000 implements MigrationInterface {
  name = 'CampaignActionType1778640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaign"
        ADD COLUMN IF NOT EXISTS "action_type" varchar(20) NOT NULL DEFAULT 'both'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN IF EXISTS "action_type"`);
  }
}
