import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Kulüp işlem kayıtları tablosu — append-only, silinemez.
 */
export class ClubAuditLog1778860000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS club_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        actor_user_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        details JSONB NOT NULL DEFAULT '{}',
        ip_address VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_club_audit_tenant ON club_audit_log(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_club_audit_created ON club_audit_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_club_audit_action ON club_audit_log(action);
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS club_audit_log;`);
  }
}
