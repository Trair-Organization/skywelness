import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stripe webhook idempotency + misafir kullanıcı flag'i.
 *
 * - appointment.stripe_session_id: webhook'un aynı session için tekrar tetiklenmesinde
 *   çift kayıt oluşmasını engellemek için unique olmayan ama indexli kolon
 * - appointment.stripe_payment_intent_id: refund/iade işlemleri için referans
 * - user.is_guest: misafir ödeme akışında oluşturulan kullanıcılar için flag
 *   (bu kullanıcılar passwordHash boş; login için şifre sıfırlama yapmaları gerekir)
 */
export class StripeAndGuestUser1778610000000 implements MigrationInterface {
  name = 'StripeAndGuestUser1778610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Appointment: Stripe alanları
    await queryRunner.query(`
      ALTER TABLE "appointment"
        ADD COLUMN IF NOT EXISTS "stripe_session_id" varchar(200),
        ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" varchar(200)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_appointment_stripe_session_id"
      ON "appointment" ("stripe_session_id")
    `);

    // User: misafir flag
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "is_guest" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_appointment_stripe_session_id"`);
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP COLUMN IF EXISTS "stripe_payment_intent_id"`,
    );
    await queryRunner.query(`ALTER TABLE "appointment" DROP COLUMN IF EXISTS "stripe_session_id"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "is_guest"`);
  }
}
