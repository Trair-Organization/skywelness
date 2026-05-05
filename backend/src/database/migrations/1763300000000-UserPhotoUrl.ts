import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPhotoUrl1763300000000 implements MigrationInterface {
  name = 'UserPhotoUrl1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "photo_url" character varying(2048)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "photo_url"`);
  }
}
