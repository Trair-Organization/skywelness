import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Paket talebi pipeline alanları:
 * - admin_note: İç not (üyeye görünmez)
 * - payment_status: pending | paid | waived
 * - payment_method: cash | card | transfer | null
 * - contacted_at: Admin üyeyle iletişime geçtiği tarih
 * - status genişletme: pending → contacted → payment_pending → approved → rejected
 */
export class PackageRequestPipeline1763900000000 implements MigrationInterface {
  name = 'PackageRequestPipeline1763900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "package_request" ADD COLUMN IF NOT EXISTS "admin_note" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_request" ADD COLUMN IF NOT EXISTS "payment_status" character varying(24) DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_request" ADD COLUMN IF NOT EXISTS "payment_method" character varying(24)`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_request" ADD COLUMN IF NOT EXISTS "contacted_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_request" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_request" ADD COLUMN IF NOT EXISTS "assigned_package_id" uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "package_request" DROP COLUMN IF EXISTS "assigned_package_id"`,
    );
    await queryRunner.query(`ALTER TABLE "package_request" DROP COLUMN IF EXISTS "approved_at"`);
    await queryRunner.query(`ALTER TABLE "package_request" DROP COLUMN IF EXISTS "contacted_at"`);
    await queryRunner.query(`ALTER TABLE "package_request" DROP COLUMN IF EXISTS "payment_method"`);
    await queryRunner.query(`ALTER TABLE "package_request" DROP COLUMN IF EXISTS "payment_status"`);
    await queryRunner.query(`ALTER TABLE "package_request" DROP COLUMN IF EXISTS "admin_note"`);
  }
}
