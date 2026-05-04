import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PackageRequestPreferredTrainer1762700000000 implements MigrationInterface {
  name = 'PackageRequestPreferredTrainer1762700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "package_request" ADD "preferred_trainer_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "package_request"
      ADD CONSTRAINT "FK_package_request_preferred_trainer"
      FOREIGN KEY ("preferred_trainer_id") REFERENCES "trainer"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_package_request_preferred_trainer" ON "package_request" ("preferred_trainer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_package_request_preferred_trainer"`);
    await queryRunner.query(
      `ALTER TABLE "package_request" DROP CONSTRAINT IF EXISTS "FK_package_request_preferred_trainer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "package_request" DROP COLUMN IF EXISTS "preferred_trainer_id"`,
    );
  }
}
