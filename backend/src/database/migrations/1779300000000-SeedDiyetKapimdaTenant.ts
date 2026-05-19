import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * DiyetKapimda — Beslenme & diyet paketi satışı yapan partner tenant.
 * Public marketplace tenant: Discover/Keşif sayfasında görünür.
 *
 * Admin giriş: admin@diyetkapimda.com / DiyetKapimda2026!
 * Şifre hash: bcrypt 12 round (SkyCafe ile aynı hash kullanılıyor)
 */
export class SeedDiyetKapimdaTenant1779300000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // 1. Tenant oluştur
    await qr.query(`
      INSERT INTO tenant (
        id, name, subdomain, vertical, visibility_mode, description, location,
        services, featured, branding, settings, invite_code, logo_url, cover_image_url
      )
      VALUES (
        uuid_generate_v4(),
        'Diyet Kapımda',
        'diyetkapimda',
        'nutrition',
        'public',
        'Sağlıklı beslenmenin en kolay hali. Uzman diyetisyen kontrolünde, usta aşçıların elinden hazırlanan paketler her sabah kapınızda.',
        'İstanbul',
        ARRAY['Diyet Paketi', 'Detoks', 'Kilo Verme', 'Kilo Alma', 'Tek Öğün'],
        true,
        '{"primaryColor": "#16a34a", "accentColor": "#22c55e"}',
        '{"workspaceType": "nutrition_partner", "externalUrl": "https://diyetkapimda.com"}',
        'DIYETKAP',
        'https://diyetkapimda.com/App/View/Assets/img/logo.png',
        'https://diyetkapimda.com/Upload/paketler/resimler/DK%20Slider%20(1).jpg'
      )
      ON CONFLICT (subdomain) DO NOTHING
    `);

    // 2. Admin kullanıcı
    await qr.query(`
      INSERT INTO "user" (
        id, tenant_id, email, username, public_id, password_hash,
        first_name, last_name, role, account_status, failed_login_attempts
      )
      SELECT
        uuid_generate_v4(),
        t.id,
        'admin@diyetkapimda.com',
        'diyetkapimda-admin',
        'KLB-DKAP',
        '$2b$12$7w3DmCBV8TawJfy8HRbxyO9K95RrgBgCGpPq4WFgxX7a/MeLE6i86',
        'Diyet Kapımda',
        'Admin',
        'administrator',
        'active',
        0
      FROM tenant t
      WHERE t.subdomain = 'diyetkapimda'
        AND NOT EXISTS (
          SELECT 1 FROM "user" u2
          WHERE u2.tenant_id = t.id AND u2.email = 'admin@diyetkapimda.com'
        )
    `);

    // 3. Paket ürünlerini ekle (cafe_product tablosu generic ürün katalogu)
    const packages = [
      {
        name: '5 Days Pack',
        category: 'Detoks',
        price: 1030,
        image: '5_Days_Pack_500x700px.jpg',
        externalId: 146,
      },
      {
        name: '10 Days Pack',
        category: 'Kilo Verme',
        price: 970,
        image: '10_Days_Pack_500x700px.jpg',
        externalId: 159,
      },
      {
        name: 'Office Pack',
        category: 'Tek Öğün',
        price: 520,
        image: 'Office_Pack_500x700px.jpg',
        externalId: 168,
      },
      {
        name: '21 Days Pack',
        category: 'Kilo Verme',
        price: 970,
        image: '21_Days_Pack_500x700px.jpg',
        externalId: 160,
      },
      {
        name: 'Fit Pack Pro',
        category: 'Kilo Koruma',
        price: 1150,
        image: 'Fit_Pack_PRO_500x700px.jpg',
        externalId: 167,
      },
      {
        name: 'Body Pack (3500-4000 kcal)',
        category: 'Özel Beslenme',
        price: 1490,
        image: 'Body_Pack_500x700px.jpg',
        externalId: 153,
      },
      {
        name: '65+ Pack',
        category: 'Özel Beslenme',
        price: 990,
        image: '65_plus_Pack_500x700px.jpg',
        externalId: 154,
      },
      {
        name: 'Fit Pack Plus',
        category: 'Kilo Alma',
        price: 1150,
        image: 'Fit_Pack_Plus_500x700px.jpg',
        externalId: 164,
      },
      {
        name: 'Slim Pack',
        category: 'Kilo Verme',
        price: 990,
        image: 'Slim_Pack_500x700px.jpg',
        externalId: 158,
      },
      {
        name: 'Starter Pack',
        category: 'Detoks',
        price: 1140,
        image: 'Starter_Pack_500x700px.jpg',
        externalId: 148,
      },
      {
        name: 'Slim Pack Plus',
        category: 'Kilo Alma',
        price: 990,
        image: 'Slim_Pack_Plus_500x700px.jpg',
        externalId: 163,
      },
      {
        name: 'Slim Pack Pro',
        category: 'Kilo Koruma',
        price: 990,
        image: 'Slim_Pack_PRO_500x700px.jpg',
        externalId: 166,
      },
      {
        name: 'Office Pack Veggie',
        category: 'Tek Öğün',
        price: 520,
        image: 'Office_Pack_500x700px.jpg',
        externalId: 165,
      },
      {
        name: 'Fit Pack',
        category: 'Kilo Verme',
        price: 1150,
        image: 'Fit_Pack_500x700px.jpg',
        externalId: 161,
      },
      {
        name: 'Veggie Pack',
        category: 'Özel Beslenme',
        price: 990,
        image: 'Veggie_Pack_500x700px.jpg',
        externalId: 157,
      },
      {
        name: 'Mother Pack',
        category: 'Özel Beslenme',
        price: 1150,
        image: 'Mother_Pack_500x700px.jpg',
        externalId: 149,
      },
      {
        name: 'Keto Pack',
        category: 'Özel Beslenme',
        price: 1250,
        image: 'Keto_Pack_500x700px.jpg',
        externalId: 151,
      },
      {
        name: 'Fasting Pack',
        category: 'Özel Beslenme',
        price: 990,
        image: 'Fasting_Pack_500x700px.jpg',
        externalId: 150,
      },
      {
        name: 'Eco Pack',
        category: 'Özel Beslenme',
        price: 1580,
        image: 'Eco_Pack_500x700px.jpg',
        externalId: 155,
      },
      {
        name: 'Family Pack',
        category: 'Özel Beslenme',
        price: 1940,
        image: 'Family_Pack_500x700px.jpg',
        externalId: 156,
      },
      {
        name: 'Body Pack (2500-3000 kcal)',
        category: 'Özel Beslenme',
        price: 1370,
        image: 'Body_Pack_500x700px.jpg',
        externalId: 152,
      },
      {
        name: 'Office Pack Protein',
        category: 'Tek Öğün',
        price: 570,
        image: 'Office_Pack_PRO_500x700px.jpg',
        externalId: 162,
      },
      {
        name: 'Black Series Detoks',
        category: 'Detoks',
        price: 1380,
        image: 'Black_Detox_500x700px.jpg',
        externalId: 145,
      },
      {
        name: 'Classic Series Detoks',
        category: 'Detoks',
        price: 1380,
        image: 'Classic_Detox_500x700px.jpg',
        externalId: 147,
      },
    ];

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      const imageUrl = `https://diyetkapimda.com/Upload/paketler/resimler/${p.image}`;
      const description = `${p.name} — ${p.category}. Detay ve sipariş için diyetkapimda.com/paket?id=${p.externalId}`;

      await qr.query(
        `
        INSERT INTO cafe_product (
          id, tenant_id, name, category, description, price, currency,
          image_url, active, sort_order
        )
        SELECT
          uuid_generate_v4(),
          t.id,
          $1,
          $2,
          $3,
          $4,
          'TRY',
          $5,
          true,
          $6
        FROM tenant t
        WHERE t.subdomain = 'diyetkapimda'
          AND NOT EXISTS (
            SELECT 1 FROM cafe_product cp
            WHERE cp.tenant_id = t.id AND cp.name = $1
          )
        `,
        [p.name, p.category, description, p.price, imageUrl, i],
      );
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DELETE FROM cafe_product WHERE tenant_id = (
        SELECT id FROM tenant WHERE subdomain = 'diyetkapimda'
      )
    `);
    await qr.query(`
      DELETE FROM "user" WHERE tenant_id = (
        SELECT id FROM tenant WHERE subdomain = 'diyetkapimda'
      )
    `);
    await qr.query(`DELETE FROM tenant WHERE subdomain = 'diyetkapimda'`);
  }
}
