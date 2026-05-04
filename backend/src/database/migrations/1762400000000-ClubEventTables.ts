import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClubEventTables1762400000000 implements MigrationInterface {
  name = 'ClubEventTables1762400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "club_event" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "description" text,
        "image_url" character varying(2000),
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE,
        "capacity" integer NOT NULL DEFAULT 30,
        "published" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_club_event" PRIMARY KEY ("id"),
        CONSTRAINT "FK_club_event_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_club_event_tenant_starts" ON "club_event" ("tenant_id", "starts_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "club_event_registration" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "club_event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_club_event_registration" PRIMARY KEY ("id"),
        CONSTRAINT "FK_cer_event" FOREIGN KEY ("club_event_id") REFERENCES "club_event"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_cer_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_cer_event_user" UNIQUE ("club_event_id", "user_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cer_event" ON "club_event_registration" ("club_event_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "club_event_registration"`);
    await queryRunner.query(`DROP TABLE "club_event"`);
  }
}
