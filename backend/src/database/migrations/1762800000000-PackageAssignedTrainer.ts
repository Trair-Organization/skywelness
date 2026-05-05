import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PackageAssignedTrainer1762800000000 implements MigrationInterface {
  name = 'PackageAssignedTrainer1762800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "package" ADD "assigned_trainer_id" uuid`);
    await queryRunner.query(`
      ALTER TABLE "package"
      ADD CONSTRAINT "FK_package_assigned_trainer"
      FOREIGN KEY ("assigned_trainer_id") REFERENCES "trainer"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_package_assigned_trainer" ON "package" ("assigned_trainer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_package_assigned_trainer"`);
    await queryRunner.query(
      `ALTER TABLE "package" DROP CONSTRAINT IF EXISTS "FK_package_assigned_trainer"`,
    );
    await queryRunner.query(`ALTER TABLE "package" DROP COLUMN IF EXISTS "assigned_trainer_id"`);
  }
}
