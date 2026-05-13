import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cafe ürün kataloğu — partner cafe'ler kendi ürünlerini yönetir.
 * Admin panelden CRUD, mobil'den sipariş.
 */
export class CafeProductCatalog1778570000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS cafe_product (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
        image_url VARCHAR(2048),
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`CREATE INDEX IF NOT EXISTS idx_cafe_product_tenant ON cafe_product(tenant_id, category, active)`);

    // Seed SkyCafe ürünleri
    await qr.query(`
      INSERT INTO cafe_product (tenant_id, name, category, description, price, sort_order) VALUES
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Sky Kahvaltı', 'Kahvaltı', 'Avakado, haşlanmış/çırpılmış yumurta (3 adet), Akdeniz yeşilliği, çeri domates, salatalık, havuç, pancar, ekşi maya ekmek + filtre kahve', 450, 1),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Sky Protein Bowl', 'Yemek', 'Akdeniz yeşillikleri, çeri domates, salatalık, havuç, pancar, avakado, ızgara tavuk veya köfte. Protein, enerji, dengeli, doyurucu.', 450, 2),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Sky Wrap (Tavuk/Köfteli)', 'Yemek', 'Akdeniz yeşillikleri, çeri domates, salatalık, havuç, pancar, kaçya biber, avakado. Özel Sky Wrap sos ile.', 450, 3),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Sky Mix 5cl', 'Kokteyller', 'Cin/Vodka/Tekila/Rom + Aroma seçimi (Grapefruit & Basil, Blueberry & Lavender, Peach & Passion Fruit, Rosemary & Elderflower & Strawberry)', 450, 4),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Sky Mix 10cl', 'Kokteyller', 'Cin/Vodka/Tekila/Rom + Aroma seçimi (Grapefruit & Basil, Blueberry & Lavender, Peach & Passion Fruit, Rosemary & Elderflower & Strawberry)', 500, 5),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Mocktail (Alkolsüz)', 'Mocktails', 'Flower Series aromaları + Soda veya Tonic', 350, 6),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Churchill', 'Soft İçecekler', NULL, 130, 7),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Cola Cola', 'Soft İçecekler', NULL, 120, 8),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Cola Cola Zero', 'Soft İçecekler', NULL, 125, 9),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Soda', 'Soft İçecekler', NULL, 70, 10),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Negroni', 'Signature Classics', 'Klasik kokteyl', 650, 11),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Margarita', 'Signature Classics', 'Klasik kokteyl', 650, 12),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Mojito', 'Signature Classics', 'Klasik kokteyl', 650, 13),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Whiskey Sour', 'Signature Classics', 'Klasik kokteyl', 650, 14),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Pornstar Martini', 'Signature Classics', 'Klasik kokteyl', 650, 15),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Dry Martini', 'Signature Classics', 'Martini çeşidi', 650, 16),
      ((SELECT id FROM tenant WHERE subdomain='skycafe'), 'Dirty Martini', 'Signature Classics', 'Martini çeşidi', 650, 17)
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS cafe_product`);
  }
}
