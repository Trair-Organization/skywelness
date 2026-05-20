import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User tablosuna slug kolonu ekler ve mevcut kullanıcılar için
 * isim soyisimden SEO-friendly slug üretir.
 *
 * Public URL örnekleri:
 *   /trainer/baha-citir
 *   /trainer/grisilda-kola
 *
 * Çakışma durumunda -2, -3 gibi sayısal eklenir.
 */
export class UserSlug1779400000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // 1. slug kolonu ekle (nullable, unique)
    await qr.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "slug" varchar(80)
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_slug" ON "user" ("slug")
      WHERE slug IS NOT NULL
    `);

    // 2. Türkçe karakter dönüşümü için yardımcı fonksiyon
    await qr.query(`
      CREATE OR REPLACE FUNCTION pg_temp.tr_slugify(input text) RETURNS text AS $$
      DECLARE
        result text;
      BEGIN
        result := lower(input);
        result := translate(result,
          'çğıöşüâîûÇĞIİÖŞÜÂÎÛ',
          'cgiosuaiuCGIIOSUAIU'
        );
        -- alfanumerik dışı karakterleri tireye çevir
        result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
        -- baş ve sondaki tireleri temizle
        result := trim(both '-' from result);
        -- ardışık tireleri tek tire yap (zaten regex bir şey ama çift kontrol)
        result := regexp_replace(result, '-+', '-', 'g');
        RETURN result;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // 3. Mevcut tüm kullanıcılar için base slug üret (first_name + last_name)
    // Çakışma çözümü: row_number() ile -2, -3 ekle
    await qr.query(`
      WITH base AS (
        SELECT
          id,
          pg_temp.tr_slugify(first_name || ' ' || last_name) AS base_slug
        FROM "user"
        WHERE slug IS NULL
      ),
      ranked AS (
        SELECT
          id,
          base_slug,
          ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY id) AS rn
        FROM base
        WHERE base_slug IS NOT NULL AND base_slug != ''
      )
      UPDATE "user" u
      SET slug = CASE WHEN r.rn = 1 THEN r.base_slug ELSE r.base_slug || '-' || r.rn END
      FROM ranked r
      WHERE u.id = r.id
    `);

    // 4. Yeni kullanıcılar için otomatik slug atayan kalıcı fonksiyon + trigger
    await qr.query(`
      CREATE OR REPLACE FUNCTION user_slugify(input text) RETURNS text AS $$
      DECLARE result text;
      BEGIN
        result := lower(input);
        result := translate(result,
          'çğıöşüâîûÇĞIİÖŞÜÂÎÛ',
          'cgiosuaiuCGIIOSUAIU'
        );
        result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
        result := trim(both '-' from result);
        result := regexp_replace(result, '-+', '-', 'g');
        RETURN NULLIF(result, '');
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await qr.query(`
      CREATE OR REPLACE FUNCTION user_assign_slug() RETURNS trigger AS $$
      DECLARE
        base_slug text;
        candidate text;
        suffix int := 1;
      BEGIN
        IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
          RETURN NEW;
        END IF;
        base_slug := user_slugify(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
        IF base_slug IS NULL THEN
          base_slug := 'kullanici';
        END IF;
        candidate := base_slug;
        WHILE EXISTS (SELECT 1 FROM "user" WHERE slug = candidate AND id != NEW.id) LOOP
          suffix := suffix + 1;
          candidate := base_slug || '-' || suffix;
          IF suffix > 1000 THEN EXIT; END IF;
        END LOOP;
        NEW.slug := candidate;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await qr.query(`
      DROP TRIGGER IF EXISTS user_slug_trigger ON "user";
      CREATE TRIGGER user_slug_trigger
      BEFORE INSERT ON "user"
      FOR EACH ROW
      EXECUTE FUNCTION user_assign_slug();
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TRIGGER IF EXISTS user_slug_trigger ON "user"`);
    await qr.query(`DROP FUNCTION IF EXISTS user_assign_slug() CASCADE`);
    await qr.query(`DROP FUNCTION IF EXISTS user_slugify(text) CASCADE`);
    await qr.query(`DROP INDEX IF EXISTS "UQ_user_slug"`);
    await qr.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS "slug"`);
  }
}
