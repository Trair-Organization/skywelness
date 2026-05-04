import type { MigrationInterface, QueryRunner } from 'typeorm';

export class WaitingListActiveUnique1738516200000 implements MigrationInterface {
  name = 'WaitingListActiveUnique1738516200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_waiting_list_active_slot_user"
      ON "waiting_list" ("time_slot_id", "user_id")
      WHERE "status" = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_waiting_list_active_slot_user"`);
  }
}
