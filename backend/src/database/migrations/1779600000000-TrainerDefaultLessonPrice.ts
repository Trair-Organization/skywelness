import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Eğitmenin varsayılan ders fiyatı.
 * Gelir hesaplamasında ve paket bağlanmamış derslerde referans olarak kullanılır.
 * Varsayılan 1000 TRY. Eğitmen kendi profilinden değiştirir.
 */
export class TrainerDefaultLessonPrice1779600000000 implements MigrationInterface {
  name = 'TrainerDefaultLessonPrice1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trainer"
        ADD COLUMN IF NOT EXISTS "default_lesson_price" numeric(10,2) NOT NULL DEFAULT 1000.00
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trainer" DROP COLUMN IF EXISTS "default_lesson_price"`,
    );
  }
}
