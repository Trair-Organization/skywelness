import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TrainerOffersSessionTypes1762600000000 implements MigrationInterface {
  name = 'TrainerOffersSessionTypes1762600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trainer"
      ADD "offers_session_types" text[] NOT NULL DEFAULT ARRAY['personal_training','massage']::text[]
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trainer" DROP COLUMN "offers_session_types"`);
  }
}
