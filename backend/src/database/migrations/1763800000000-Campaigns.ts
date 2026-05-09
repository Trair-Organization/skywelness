import { MigrationInterface, QueryRunner } from 'typeorm';

export class Campaigns1763800000000 implements MigrationInterface {
  name = 'Campaigns1763800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "campaign" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text,
        "campaign_type" character varying(40) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "discount_kind" character varying(20) NOT NULL,
        "discount_value" numeric(10,2) NOT NULL,
        "image_url" character varying(2048),
        "audience" character varying(30) NOT NULL DEFAULT 'everyone',
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "max_redemptions" integer,
        "redemption_count" integer NOT NULL DEFAULT 0,
        "view_count" integer NOT NULL DEFAULT 0,
        "click_count" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaign" PRIMARY KEY ("id"),
        CONSTRAINT "FK_campaign_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_tenant_status" ON "campaign" ("tenant_id", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_campaign_tenant_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign" CASCADE`);
  }
}
