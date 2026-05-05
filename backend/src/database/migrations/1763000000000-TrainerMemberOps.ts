import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TrainerMemberOps1763000000000 implements MigrationInterface {
  name = 'TrainerMemberOps1763000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trainer_member_link" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_link" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trainer_member_link_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_member_link_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_member_link_member_user" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_trainer_member_link_unique"
      ON "trainer_member_link" ("tenant_id", "trainer_id", "member_user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "trainer_member_note" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "member_user_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "note" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_member_note" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trainer_member_note_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_member_note_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_member_note_member_user" FOREIGN KEY ("member_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_member_note_created_by" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_trainer_member_note_lookup" ON "trainer_member_note" ("trainer_id", "member_user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_member_note_lookup"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trainer_member_note"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_member_link_unique"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trainer_member_link"`);
  }
}
