import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rezervasyon kaydının masöz (SpaTherapist) ile ilişkilendirilmesi.
 * - trainer_id artık nullable (masaj rezervasyonunda boş olur)
 * - package_id ve time_slot_id de nullable (admin tarafından oluşturulan direk rezervasyonlarda boş)
 * - spa_therapist_id kolonu eklenir, spa_therapist(id) FK ile bağlanır (ON DELETE SET NULL)
 */
export class ReservationSpaTherapist1763880000000 implements MigrationInterface {
  name = 'ReservationSpaTherapist1763880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // trainer_id / package_id / time_slot_id nullable yap (admin masaj rezervasyonları için gerekli)
    await queryRunner.query(`ALTER TABLE "reservation" ALTER COLUMN "trainer_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "reservation" ALTER COLUMN "package_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "reservation" ALTER COLUMN "time_slot_id" DROP NOT NULL`);

    // spa_therapist_id kolonu ekle + FK bağla
    await queryRunner.query(
      `ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "spa_therapist_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation"
       ADD CONSTRAINT "FK_reservation_spa_therapist"
       FOREIGN KEY ("spa_therapist_id")
       REFERENCES "spa_therapist"("id")
       ON DELETE SET NULL`,
    );

    // Masöz takvim sorguları için index
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reservation_tenant_therapist_start"
       ON "reservation" ("tenant_id", "spa_therapist_id", "start_time")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reservation_tenant_therapist_start"`);
    await queryRunner.query(
      `ALTER TABLE "reservation" DROP CONSTRAINT IF EXISTS "FK_reservation_spa_therapist"`,
    );
    await queryRunner.query(`ALTER TABLE "reservation" DROP COLUMN IF EXISTS "spa_therapist_id"`);
    // NOT NULL'a geri dönüş (sadece mevcut veride null yoksa çalışır)
    await queryRunner.query(`ALTER TABLE "reservation" ALTER COLUMN "time_slot_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "reservation" ALTER COLUMN "package_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "reservation" ALTER COLUMN "trainer_id" SET NOT NULL`);
  }
}
