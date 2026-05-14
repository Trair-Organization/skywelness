import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Conversation tablosuna lastMessageSenderId — gelen/gönderilen filtreleme için.
 */
export class ConversationLastSender1778650000000 implements MigrationInterface {
  name = 'ConversationLastSender1778650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "conversation"
        ADD COLUMN IF NOT EXISTS "last_message_sender_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation" DROP COLUMN IF EXISTS "last_message_sender_id"`,
    );
  }
}
