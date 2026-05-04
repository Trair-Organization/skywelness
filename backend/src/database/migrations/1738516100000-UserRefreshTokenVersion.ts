import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRefreshTokenVersion1738516100000 implements MigrationInterface {
  name = 'UserRefreshTokenVersion1738516100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "refresh_token_version" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "refresh_token_version"`);
  }
}
