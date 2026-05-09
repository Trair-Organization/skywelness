import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignPriceAndTerms1763820000000 implements MigrationInterface {
  name = 'CampaignPriceAndTerms1763820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign" ADD COLUMN "original_price" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "campaign" ADD COLUMN "discounted_price" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "campaign" ADD COLUMN "terms" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN IF EXISTS "terms"`);
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN IF EXISTS "discounted_price"`);
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN IF EXISTS "original_price"`);
  }
}
