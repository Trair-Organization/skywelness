import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformAdminAuditLog1763600000000 implements MigrationInterface {
  name = 'PlatformAdminAuditLog1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "platform_admin_audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actor_user_id" uuid,
        "action" character varying(100) NOT NULL,
        "target_type" character varying(80) NOT NULL,
        "target_id" character varying(100) NOT NULL,
        "details" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_platform_admin_audit_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_platform_admin_audit_log_created_at" ON "platform_admin_audit_log" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_platform_admin_audit_log_action_created" ON "platform_admin_audit_log" ("action", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_platform_admin_audit_log_action_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_platform_admin_audit_log_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_admin_audit_log"`);
  }
}
