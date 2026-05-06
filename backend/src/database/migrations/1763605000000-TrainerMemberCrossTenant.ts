import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TrainerMemberCrossTenant1763605000000 implements MigrationInterface {
  name = 'TrainerMemberCrossTenant1763605000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_member_link_unique"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_trainer_member_link_unique"
      ON "trainer_member_link" ("trainer_id", "member_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_trainer_member_link_unique"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_trainer_member_link_unique"
      ON "trainer_member_link" ("tenant_id", "trainer_id", "member_user_id")
    `);
  }
}
