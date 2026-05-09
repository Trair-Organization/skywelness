import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventEnhancements1763870000000 implements MigrationInterface {
  name = 'EventEnhancements1763870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "club_event" ADD COLUMN "category" character varying(50) DEFAULT 'general'`,
    );
    await queryRunner.query(`ALTER TABLE "club_event" ADD COLUMN "requirements" text`);
    await queryRunner.query(`ALTER TABLE "club_event" ADD COLUMN "schedule" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "schedule"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "requirements"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "category"`);
  }
}
