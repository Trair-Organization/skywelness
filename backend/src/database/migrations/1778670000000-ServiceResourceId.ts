import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * service_catalog ve schedule_slot'a resource_id ekleme.
 * Masaj odaları, PT stüdyoları gibi fiziksel kaynakları hizmet/slot ile eşleştirir.
 * Opsiyonel — kort kiralama gibi resource-based hizmetler için kullanılır.
 */
export class ServiceResourceId1778670000000 implements MigrationInterface {
  name = 'ServiceResourceId1778670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_catalog"
        ADD COLUMN IF NOT EXISTS "resource_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "schedule_slot"
        ADD COLUMN IF NOT EXISTS "resource_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schedule_slot" DROP COLUMN IF EXISTS "resource_id"`);
    await queryRunner.query(`ALTER TABLE "service_catalog" DROP COLUMN IF EXISTS "resource_id"`);
  }
}
