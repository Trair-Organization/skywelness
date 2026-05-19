import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Package tablosuna Stripe checkout ve tenant alanları ekle.
 */
export class PackageCheckoutFields1779200000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      `ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "tenant_id" UUID REFERENCES "tenant"("id") ON DELETE CASCADE`,
    );
    await qr.query(
      `ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "stripe_session_id" VARCHAR(255)`,
    );
    await qr.query(`ALTER TABLE "package" ADD COLUMN IF NOT EXISTS "activated_at" TIMESTAMPTZ`);
    await qr.query(`CREATE INDEX IF NOT EXISTS "IDX_package_tenant" ON "package" ("tenant_id")`);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS "IDX_package_stripe_session" ON "package" ("stripe_session_id")`,
    );
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE "package" DROP COLUMN IF EXISTS "activated_at"`);
    await qr.query(`ALTER TABLE "package" DROP COLUMN IF EXISTS "stripe_session_id"`);
    await qr.query(`ALTER TABLE "package" DROP COLUMN IF EXISTS "tenant_id"`);
  }
}
