import { MigrationInterface, QueryRunner } from 'typeorm';

export class CampaignFeatured1763810000000 implements MigrationInterface {
  name = 'CampaignFeatured1763810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "campaign" ADD COLUMN "featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_featured" ON "campaign" ("featured") WHERE "featured" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_campaign_featured"`);
    await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "featured"`);
  }
}
