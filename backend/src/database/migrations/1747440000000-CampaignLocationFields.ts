import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignLocationFields1747440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign" ADD COLUMN IF NOT EXISTS "target_city" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "campaign" ADD COLUMN IF NOT EXISTS "target_district" VARCHAR(100)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_campaign_target_city" ON "campaign" ("target_city")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_campaign_target_city"`);
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN IF EXISTS "target_district"`);
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN IF EXISTS "target_city"`);
  }
}
