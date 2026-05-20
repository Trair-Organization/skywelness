import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Diyet Kapımda — başlangıç puanı 5.0 olarak ayarla.
 * Yeni kullanıcı yorumları geldikçe recalculateRating servisi
 * otomatik olarak ortalamayi güncelleyecek.
 */
export class SetDiyetKapimdaRating1779400000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      UPDATE tenant
      SET avg_rating = 5.00, review_count = 1
      WHERE subdomain = 'diyetkapimda'
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      UPDATE tenant
      SET avg_rating = 0, review_count = 0
      WHERE subdomain = 'diyetkapimda'
    `);
  }
}
