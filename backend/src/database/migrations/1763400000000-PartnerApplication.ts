import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PartnerApplication1763400000000 implements MigrationInterface {
  name = 'PartnerApplication1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partner_application" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "company_name" character varying(180) NOT NULL,
        "contact_name" character varying(180) NOT NULL,
        "email" character varying(320) NOT NULL,
        "phone" character varying(40) NOT NULL,
        "city" character varying(120) NOT NULL,
        "club_count" integer,
        "website" character varying(2048),
        "logo_url" character varying(2048),
        "notes" text,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partner_application" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_partner_application_status_created" ON "partner_application" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_partner_application_status_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "partner_application"`);
  }
}
