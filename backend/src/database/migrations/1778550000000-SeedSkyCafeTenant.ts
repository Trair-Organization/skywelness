import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SkyCafe — Private partner tenant.
 * Rezidans sakinleri (Skyland Wellness üyeleri) sipariş verebilir.
 * Kendi admin paneli ayrı çalışır.
 *
 * Admin giriş: admin@skycafe.com / SkyCafe2026!
 */
export class SeedSkyCafeTenant1778550000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // 1. SkyCafe tenant oluştur
    await qr.query(`
      INSERT INTO tenant (id, name, subdomain, vertical, visibility_mode, description, location, services, featured, branding, settings, invite_code)
      VALUES (
        uuid_generate_v4(),
        'SkyCafe',
        'skycafe',
        'other',
        'private',
        'Skyland Rezidans SkyCafe — Kahve, yiyecek ve içecek siparişi.',
        'İstanbul',
        ARRAY['Kahve', 'Yiyecek', 'İçecek', 'Tatlı'],
        true,
        '{}',
        '{"workspaceType": "partner_club"}',
        'SKYCAFE1'
      )
      ON CONFLICT (subdomain) DO NOTHING
    `);

    // 2. SkyCafe admin kullanıcı oluştur
    await qr.query(`
      INSERT INTO "user" (
        id, tenant_id, email, username, public_id, password_hash,
        first_name, last_name, role, account_status, failed_login_attempts
      )
      SELECT
        uuid_generate_v4(),
        t.id,
        'admin@skycafe.com',
        'skycafe-admin',
        'MBR-9990',
        '$2b$12$7w3DmCBV8TawJfy8HRbxyO9K95RrgBgCGpPq4WFgxX7a/MeLE6i86',
        'SkyCafe',
        'Admin',
        'administrator',
        'active',
        0
      FROM tenant t
      WHERE t.subdomain = 'skycafe'
        AND NOT EXISTS (
          SELECT 1 FROM "user" u2
          WHERE u2.tenant_id = t.id AND u2.email = 'admin@skycafe.com'
        )
    `);

    // 3. Skyland Wellness active üyelerini SkyCafe'ye de ekle (otomatik onaylı)
    await qr.query(`
      INSERT INTO "user" (
        id, tenant_id, email, username, public_id, password_hash,
        first_name, last_name, phone, photo_url, role, account_status,
        failed_login_attempts
      )
      SELECT
        uuid_generate_v4(),
        (SELECT id FROM tenant WHERE subdomain = 'skycafe'),
        u.email,
        u.username || '-cafe',
        'MBR-' || LPAD((ROW_NUMBER() OVER (ORDER BY u.created_at) + 8000)::text, 4, '0'),
        u.password_hash,
        u.first_name,
        u.last_name,
        u.phone,
        u.photo_url,
        'member',
        'active',
        0
      FROM "user" u
      WHERE u.tenant_id = (SELECT id FROM tenant WHERE subdomain = 'skyland-wellness')
        AND u.role = 'member'
        AND u.account_status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM "user" u2
          WHERE u2.tenant_id = (SELECT id FROM tenant WHERE subdomain = 'skycafe')
            AND u2.email = u.email
        )
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      DELETE FROM "user" WHERE tenant_id = (SELECT id FROM tenant WHERE subdomain = 'skycafe')
    `);
    await qr.query(`DELETE FROM tenant WHERE subdomain = 'skycafe'`);
  }
}
