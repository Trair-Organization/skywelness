import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tenant'a gallery_images (JSONB string array) alanı ekler.
 * Partner profil sayfasındaki slider/galeri için kullanılır.
 */
export class TenantGalleryImages1778560000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE tenant
      ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE tenant DROP COLUMN IF EXISTS gallery_images`);
  }
}
