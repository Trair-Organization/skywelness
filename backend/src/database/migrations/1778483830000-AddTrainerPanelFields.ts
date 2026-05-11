import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainerPanelFields1778483830000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Reservation: iptal eden, iptal nedeni, erteleme notu
    await queryRunner.query(`
      ALTER TABLE reservation
        ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS reschedule_note TEXT DEFAULT NULL
    `);

    // TrainerMemberLink: bağlantı kaynağı
    await queryRunner.query(`
      ALTER TABLE trainer_member_link
        ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'member_request'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reservation
        DROP COLUMN IF EXISTS cancelled_by,
        DROP COLUMN IF EXISTS cancel_reason,
        DROP COLUMN IF EXISTS reschedule_note
    `);
    await queryRunner.query(`
      ALTER TABLE trainer_member_link
        DROP COLUMN IF EXISTS source
    `);
  }
}
