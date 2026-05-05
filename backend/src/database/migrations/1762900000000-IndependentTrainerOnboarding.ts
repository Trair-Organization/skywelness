import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IndependentTrainerOnboarding1762900000000 implements MigrationInterface {
  name = 'IndependentTrainerOnboarding1762900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trainer_profile" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "city" character varying(120) NOT NULL,
        "bio" text NOT NULL,
        "specialties" text array NOT NULL,
        "certifications" text array,
        "experience_years" integer,
        "social_links" jsonb,
        "photo_url" character varying(2048),
        "pricing_note" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_profile" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trainer_profile_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_profile_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_profile_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_trainer_profile_user" ON "trainer_profile" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_trainer_profile_trainer" ON "trainer_profile" ("trainer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trainer_profile_tenant" ON "trainer_profile" ("tenant_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "trainer_application" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "trainer_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'pending',
        "admin_note" text,
        "reviewed_by_user_id" uuid,
        "reviewed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trainer_application" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trainer_application_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_application_trainer" FOREIGN KEY ("trainer_id") REFERENCES "trainer"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_application_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_trainer_application_reviewed_by" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_trainer_application_user" ON "trainer_application" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_trainer_application_status" ON "trainer_application" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_application_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_application_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trainer_application"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_profile_tenant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_profile_trainer"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_profile_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trainer_profile"`);
  }
}
