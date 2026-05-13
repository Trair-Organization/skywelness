import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ana sayfa slider banner'ları için tablo.
 * Platform admin tarafından yönetilir.
 */
export class HomeBanners1778580000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE "home_banners" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "title" varchar(200) NOT NULL,
        "subtitle" text,
        "image_url" varchar(2048) NOT NULL,
        "link_url" varchar(2048),
        "button_text" varchar(100),
        "sort_order" int NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Varsayılan banner'lar
    await qr.query(`
      INSERT INTO "home_banners" ("title", "subtitle", "image_url", "sort_order") VALUES
      ('Sağlıklı Yaşamın Merkezi', 'En iyi spor kulüpleri ve wellness hizmetleri tek platformda.', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&q=80', 0),
      ('Profesyonel Eğitmenler', 'Sertifikalı eğitmenlerle kişisel antrenman programları.', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1920&q=80', 1),
      ('Wellness & Spa', 'Masaj, sauna ve detox hizmetleriyle kendinizi yenileyin.', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1920&q=80', 2);
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "home_banners";`);
  }
}
