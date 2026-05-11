import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicIds1778510000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // User: public_id (MBR-XXXX veya TRN-XXXX)
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS public_id VARCHAR(12) UNIQUE DEFAULT NULL
    `);

    // Tenant: public_id (CLB-XXXX)
    await queryRunner.query(`
      ALTER TABLE tenant ADD COLUMN IF NOT EXISTS public_id VARCHAR(12) UNIQUE DEFAULT NULL
    `);

    // Generate public IDs for existing users
    const users = (await queryRunner.query(`
      SELECT id, role, ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at) as rn
      FROM "user" WHERE public_id IS NULL
    `)) as Array<{ id: string; role: string; rn: string }>;

    for (const u of users) {
      const prefix = u.role === 'trainer' || u.role === 'independent_trainer' ? 'TRN' : 'MBR';
      const num = String(u.rn).padStart(4, '0');
      const publicId = `${prefix}-${num}`;
      await queryRunner.query(`UPDATE "user" SET public_id = $1 WHERE id = $2`, [publicId, u.id]);
    }

    // Generate public IDs for existing tenants
    const tenants = (await queryRunner.query(`
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
      FROM tenant WHERE public_id IS NULL
    `)) as Array<{ id: string; rn: string }>;

    for (const t of tenants) {
      const publicId = `CLB-${String(t.rn).padStart(4, '0')}`;
      await queryRunner.query(`UPDATE tenant SET public_id = $1 WHERE id = $2`, [publicId, t.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS public_id`);
    await queryRunner.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS public_id`);
  }
}
