import { MigrationInterface, QueryRunner } from 'typeorm';

export class Leads1763850000000 implements MigrationInterface {
  name = 'Leads1763850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "lead" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid,
        "name" character varying(120) NOT NULL,
        "phone" character varying(40) NOT NULL,
        "email" character varying(320),
        "message" text,
        "source" character varying(20) NOT NULL,
        "source_ref" character varying(200),
        "source_label" character varying(300),
        "status" character varying(20) NOT NULL DEFAULT 'new',
        "admin_note" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lead" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lead_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_lead_tenant_status" ON "lead" ("tenant_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lead_tenant_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lead" CASCADE`);
  }
}
