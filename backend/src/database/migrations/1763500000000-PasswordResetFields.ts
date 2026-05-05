import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordResetFields1763500000000 implements MigrationInterface {
  name = 'PasswordResetFields1763500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "reset_password_token_hash" character varying(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "reset_password_expires_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "reset_password_expires_at"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "reset_password_token_hash"`);
  }
}
