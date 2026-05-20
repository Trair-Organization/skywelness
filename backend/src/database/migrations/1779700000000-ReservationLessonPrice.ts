import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reservation'a ders fiyatı snapshot ekle.
 * Gelir raporlamasında geçmişe dönük tutarlılık sağlar — eğitmen fiyatını
 * sonradan değiştirse bile eski rezervasyonların geliri doğru hesaplanır.
 */
export class ReservationLessonPrice1779700000000 implements MigrationInterface {
  name = 'ReservationLessonPrice1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reservation"
        ADD COLUMN IF NOT EXISTS "lesson_price" numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "reservation"
        ADD COLUMN IF NOT EXISTS "platform_fee" numeric(10,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reservation" DROP COLUMN IF EXISTS "platform_fee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation" DROP COLUMN IF EXISTS "lesson_price"`,
    );
  }
}
