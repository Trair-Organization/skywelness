import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameToUser1762275600000 implements MigrationInterface {
  name = 'AddUsernameToUser1762275600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "username" character varying(40)`);
    await queryRunner.query(`
      UPDATE "user"
      SET "username" = lower(split_part("email", '@', 1) || '_' || substring("id"::text, 1, 8))
      WHERE "username" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_user_tenant_username" ON "user" ("tenant_id", "username")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_tenant_username"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "username"`);
  }
}
