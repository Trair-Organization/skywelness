import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAccountStatus1738516300000 implements MigrationInterface {
  name = 'UserAccountStatus1738516300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD "account_status" character varying(32) NOT NULL DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "account_status"`);
  }
}
