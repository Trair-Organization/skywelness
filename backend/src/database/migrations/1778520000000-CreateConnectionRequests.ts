import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConnectionRequests1778520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS connection_request (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
        sender_tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
        receiver_user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
        receiver_tenant_id UUID REFERENCES tenant(id) ON DELETE CASCADE,
        connection_type VARCHAR(30) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        message TEXT,
        reject_reason TEXT,
        responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_conn_req_sender_user ON connection_request(sender_user_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_conn_req_receiver_user ON connection_request(receiver_user_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_conn_req_sender_tenant ON connection_request(sender_tenant_id, status)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_conn_req_receiver_tenant ON connection_request(receiver_tenant_id, status)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS connection_request`);
  }
}
