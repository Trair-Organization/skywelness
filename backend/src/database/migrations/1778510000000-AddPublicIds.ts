import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicIds1778510000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS public_id VARCHAR(12) UNIQUE DEFAULT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_id VARCHAR(12) UNIQUE DEFAULT NULL
    `);

    // Members
    const members = (await queryRunner.query(
      `SELECT id FROM "user" WHERE public_id IS NULL AND role IN ('member', 'administrator', 'platform_admin') ORDER BY created_at`,
    )) as Array<{ id: string }>;
    for (let i = 0; i < members.length; i++) {
      await queryRunner.query(`UPDATE "user" SET public_id = $1 WHERE id = $2`, [
        `MBR-${String(i + 1).padStart(4, '0')}`,
        members[i].id,
      ]);
    }

    // Trainers
    const trainers = (await queryRunner.query(
      `SELECT id FROM "user" WHERE public_id IS NULL AND role IN ('trainer', 'independent_trainer') ORDER BY created_at`,
    )) as Array<{ id: string }>;
    for (let i = 0; i < trainers.length; i++) {
      await queryRunner.query(`UPDATE "user" SET public_id = $1 WHERE id = $2`, [
        `TRN-${String(i + 1).padStart(4, '0')}`,
        trainers[i].id,
      ]);
    }

    // Tenants
    const tenants = (await queryRunner.query(
      `SELECT id FROM tenant WHERE public_id IS NULL ORDER BY created_at`,
    )) as Array<{ id: string }>;
    for (let i = 0; i < tenants.length; i++) {
      await queryRunner.query(`UPDATE tenant SET public_id = $1 WHERE id = $2`, [
        `CLB-${String(i + 1).padStart(4, '0')}`,
        tenants[i].id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS public_id`);
    await queryRunner.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS public_id`);
  }
}
