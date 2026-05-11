import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Partner Club Visibility Model
 *
 * Adds `visibility_mode` column to `tenant` table with values `public` | `private`.
 * Default: `private` (safe conservative default — existing tenants stay private).
 * Exception: the seeded `opadel` tenant is flipped to `public` (marketplace).
 *
 * Also creates `tenant_visibility_audit` to track visibility changes for
 * accountability. See spec `partner-club-visibility` requirements 1, 2, 9.
 */
export class AddTenantVisibilityMode1778540000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // 1. visibility_mode column (default 'private')
    await qr.query(`
      ALTER TABLE tenant
      ADD COLUMN IF NOT EXISTS visibility_mode VARCHAR(10) NOT NULL DEFAULT 'private'
    `);
    await qr.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'tenant_visibility_mode_check'
        ) THEN
          ALTER TABLE tenant
          ADD CONSTRAINT tenant_visibility_mode_check
          CHECK (visibility_mode IN ('public', 'private'));
        END IF;
      END$$;
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_visibility
      ON tenant(visibility_mode) WHERE visibility_mode = 'public'
    `);

    // 2. audit table
    await qr.query(`
      CREATE TABLE IF NOT EXISTS tenant_visibility_audit (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        changed_by_user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
        previous_value VARCHAR(10) NOT NULL,
        new_value VARCHAR(10) NOT NULL,
        source VARCHAR(20) NOT NULL,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_visibility_audit_tenant
      ON tenant_visibility_audit(tenant_id, changed_at DESC)
    `);

    // 3. Seed: opadel → public (R2.2). Other partner clubs stay private.
    await qr.query(`UPDATE tenant SET visibility_mode = 'public' WHERE subdomain = 'opadel'`);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP INDEX IF EXISTS idx_tenant_visibility_audit_tenant`);
    await qr.query(`DROP TABLE IF EXISTS tenant_visibility_audit`);
    await qr.query(`DROP INDEX IF EXISTS idx_tenant_visibility`);
    await qr.query(`ALTER TABLE tenant DROP CONSTRAINT IF EXISTS tenant_visibility_mode_check`);
    await qr.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS visibility_mode`);
  }
}
