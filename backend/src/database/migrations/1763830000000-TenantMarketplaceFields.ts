import { MigrationInterface, QueryRunner } from 'typeorm';

export class TenantMarketplaceFields1763830000000 implements MigrationInterface {
  name = 'TenantMarketplaceFields1763830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "description" text`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "location" character varying(200)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "logo_url" character varying(2048)`);
    await queryRunner.query(
      `ALTER TABLE "tenant" ADD COLUMN "cover_image_url" character varying(2048)`,
    );
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "services" text[] DEFAULT '{}'`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "price_range" character varying(50)`);
    await queryRunner.query(
      `ALTER TABLE "tenant" ADD COLUMN "featured" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "phone" character varying(40)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "email" character varying(320)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "website" character varying(500)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN "avg_rating" numeric(3,2) DEFAULT 0`);
    await queryRunner.query(
      `ALTER TABLE "tenant" ADD COLUMN "review_count" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tenant_featured" ON "tenant" ("featured") WHERE "featured" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_featured"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "review_count"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "avg_rating"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "website"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "phone"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "featured"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "price_range"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "services"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "cover_image_url"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "logo_url"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "location"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "description"`);
  }
}
