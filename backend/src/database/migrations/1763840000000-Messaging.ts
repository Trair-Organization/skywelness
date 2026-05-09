import { MigrationInterface, QueryRunner } from 'typeorm';

export class Messaging1763840000000 implements MigrationInterface {
  name = 'Messaging1763840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "conversation" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "participant_a_id" uuid NOT NULL,
        "participant_b_id" uuid NOT NULL,
        "last_message_preview" text,
        "last_message_at" TIMESTAMP WITH TIME ZONE,
        "unread_count_a" integer NOT NULL DEFAULT 0,
        "unread_count_b" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversation_participant_a" FOREIGN KEY ("participant_a_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_conversation_participant_b" FOREIGN KEY ("participant_b_id") REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_conversation_participants" UNIQUE ("participant_a_id", "participant_b_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "content" text NOT NULL,
        "message_type" character varying(20) NOT NULL DEFAULT 'text',
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_message" PRIMARY KEY ("id"),
        CONSTRAINT "FK_message_conversation" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_message_sender" FOREIGN KEY ("sender_id") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_message_conversation_created" ON "message" ("conversation_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_message_conversation_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversation" CASCADE`);
  }
}
