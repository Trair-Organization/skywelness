import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationFields1747420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tenant location fields
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "district" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7)`);
    await queryRunner.query(`ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7)`);

    // User location fields
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "city" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "district" VARCHAR(100)`);
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7)`);
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7)`);

    // Index for location-based queries
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tenant_city_district" ON "tenant" ("city", "district")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_city_district" ON "user" ("city", "district")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_city_district"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenant_city_district"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "longitude"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "latitude"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "district"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "city"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "longitude"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "latitude"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "district"`);
    await queryRunner.query(`ALTER TABLE "tenant" DROP COLUMN IF EXISTS "city"`);
  }
}
