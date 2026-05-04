import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClubEventCoachLocation1762500000000 implements MigrationInterface {
  name = 'ClubEventCoachLocation1762500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "club_event" ADD "coach_name" character varying(200)`);
    await queryRunner.query(`ALTER TABLE "club_event" ADD "location" character varying(300)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN "coach_name"`);
  }
}
