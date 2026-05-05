import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TrainerApplicationPreferredClub1763200000000 implements MigrationInterface {
  name = 'TrainerApplicationPreferredClub1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trainer_application" ADD "preferred_club_subdomain" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trainer_application" DROP COLUMN "preferred_club_subdomain"`,
    );
  }
}
