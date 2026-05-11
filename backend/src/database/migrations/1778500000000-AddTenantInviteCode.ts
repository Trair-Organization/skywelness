import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantInviteCode1778500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tenant ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) UNIQUE DEFAULT NULL
    `);

    // Generate codes for existing tenants
    const tenants = (await queryRunner.query(
      `SELECT id FROM tenant WHERE invite_code IS NULL`,
    )) as Array<{ id: string }>;
    for (const t of tenants) {
      const code = this.generateCode();
      await queryRunner.query(`UPDATE tenant SET invite_code = $1 WHERE id = $2`, [code, t.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS invite_code`);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
