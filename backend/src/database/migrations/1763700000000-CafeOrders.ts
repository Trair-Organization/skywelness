import { MigrationInterface, QueryRunner } from 'typeorm';

export class CafeOrders1763700000000 implements MigrationInterface {
  name = 'CafeOrders1763700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cafe_order" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "customer_name" character varying(120) NOT NULL,
        "block_label" character varying(64) NOT NULL,
        "apartment_label" character varying(64) NOT NULL,
        "phone_number" character varying(40) NOT NULL,
        "payment_method" character varying(16) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "items_json" jsonb NOT NULL,
        "total_amount" integer NOT NULL,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cafe_order_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cafe_order_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_cafe_order_member" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cafe_order_tenant_created_at" ON "cafe_order" ("tenant_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cafe_order_member_created_at" ON "cafe_order" ("member_user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_cafe_order_member_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cafe_order_tenant_created_at"`);
    await queryRunner.query(`DROP TABLE "cafe_order"`);
  }
}
