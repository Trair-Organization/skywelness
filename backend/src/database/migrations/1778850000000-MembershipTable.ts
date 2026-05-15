import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Üyelik tablosu — kulübe erişim hakkı.
 * Paketlerden bağımsız: üyelik bitebilir ama paket hakkı devam edebilir.
 */
export class MembershipTable1778850000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS membership (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        membership_type VARCHAR(50) NOT NULL DEFAULT 'monthly',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        price NUMERIC(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_membership_user ON membership(user_id);
      CREATE INDEX IF NOT EXISTS idx_membership_tenant ON membership(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_membership_end_date ON membership(end_date);
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS membership;`);
  }
}
