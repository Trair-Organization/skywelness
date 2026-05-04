import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PackageRequest1762600100000 implements MigrationInterface {
  name = 'PackageRequest1762600100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "package_request" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "session_type" character varying(64) NOT NULL,
        "message" text,
        "status" character varying(24) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_request" PRIMARY KEY ("id"),
        CONSTRAINT "FK_package_request_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_package_request_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_package_request_tenant_id" ON "package_request" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_package_request_user_id" ON "package_request" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "package_request"`);
  }
}
