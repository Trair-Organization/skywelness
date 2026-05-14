import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Etkinliklere ücret desteği.
 * price = 0 → ücretsiz (mevcut davranış korunur)
 * price > 0 → kapora modeli ile Stripe checkout
 */
export class EventPricing1778630000000 implements MigrationInterface {
  name = 'EventPricing1778630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "club_event"
        ADD COLUMN IF NOT EXISTS "price" numeric(10,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "currency" varchar(3) NOT NULL DEFAULT 'TRY'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "club_event" DROP COLUMN IF EXISTS "price"`);
  }
}
