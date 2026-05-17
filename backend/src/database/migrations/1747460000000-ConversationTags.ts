import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationTags1747460000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "tags" JSONB DEFAULT '[]'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "conversation" DROP COLUMN IF EXISTS "tags"`);
  }
}
