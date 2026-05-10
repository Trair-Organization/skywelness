import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rezervasyona spa_service_id (masaj çeşidi) alanını ekler.
 * - spa_service(id) FK bağlanır (ON DELETE SET NULL).
 * - Raporlama/filtreleme için indeks eklenir.
 */
export class ReservationSpaService1763890000000 implements MigrationInterface {
  name = 'ReservationSpaService1763890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "spa_service_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation"
       ADD CONSTRAINT "FK_reservation_spa_service"
       FOREIGN KEY ("spa_service_id")
       REFERENCES "spa_service"("id")
       ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reservation_tenant_spa_service"
       ON "reservation" ("tenant_id", "spa_service_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reservation_tenant_spa_service"`);
    await queryRunner.query(
      `ALTER TABLE "reservation" DROP CONSTRAINT IF EXISTS "FK_reservation_spa_service"`,
    );
    await queryRunner.query(`ALTER TABLE "reservation" DROP COLUMN IF EXISTS "spa_service_id"`);
  }
}
