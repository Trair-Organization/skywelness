import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unified Booking System — Faz 1
 * 
 * Tüm sektörler (fitness, wellness, padel, spa, cafe vb.) için
 * tek bir rezervasyon altyapısı.
 * 
 * 3 yeni tablo:
 * - service_catalog: Partner'ın sunduğu hizmetler
 * - schedule_slot: Müsaitlik slotları (tüm tipler için tek tablo)
 * - appointment: Rezervasyonlar (tüm tipler için tek tablo)
 */
export class UnifiedBookingSystem1778590000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════
    // 1. SERVICE_CATALOG — Hizmet kataloğu
    // ═══════════════════════════════════════════════════════════
    await qr.query(`
      CREATE TABLE "service_catalog" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
        
        -- Hizmet bilgileri
        "name" varchar(200) NOT NULL,
        "description" text,
        "category" varchar(100) NOT NULL,
        -- category örnekleri: personal_training, massage, group_class, court_rental, 
        -- spa_treatment, nutrition_consultation, physiotherapy, yoga, pilates, swimming
        
        -- Sağlayıcı tipi ve bağlantısı
        "provider_type" varchar(50) NOT NULL,
        -- provider_type: 'trainer' | 'resource' | 'therapist' | 'staff' | 'self'
        "provider_id" uuid,
        -- trainer.id, resource.id, spa_therapist.id veya null (self = kulüp kendisi)
        
        -- Süre ve fiyat
        "duration_minutes" int NOT NULL DEFAULT 60,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'TRY',
        
        -- Kapasite (grup dersleri için > 1)
        "capacity" int NOT NULL DEFAULT 1,
        
        -- Görsel ve sıralama
        "image_url" varchar(2048),
        "sort_order" int NOT NULL DEFAULT 0,
        "active" boolean NOT NULL DEFAULT true,
        
        -- Meta
        "metadata" jsonb DEFAULT '{}',
        -- metadata örnekleri: { "level": "beginner", "equipment": ["mat", "dumbbell"] }
        
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_service_catalog_tenant" ON "service_catalog"("tenant_id");
      CREATE INDEX "idx_service_catalog_category" ON "service_catalog"("category");
      CREATE INDEX "idx_service_catalog_provider" ON "service_catalog"("provider_type", "provider_id");
    `);

    // ═══════════════════════════════════════════════════════════
    // 2. SCHEDULE_SLOT — Müsaitlik slotları
    // ═══════════════════════════════════════════════════════════
    await qr.query(`
      CREATE TABLE "schedule_slot" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
        "service_id" uuid NOT NULL REFERENCES "service_catalog"("id") ON DELETE CASCADE,
        
        -- Sağlayıcı (denormalize — hızlı sorgulama için)
        "provider_type" varchar(50) NOT NULL,
        "provider_id" uuid,
        
        -- Zaman
        "date" date NOT NULL,
        "start_time" varchar(5) NOT NULL,  -- "07:00" formatı
        "end_time" varchar(5) NOT NULL,    -- "08:00" formatı
        
        -- Kapasite
        "capacity" int NOT NULL DEFAULT 1,
        "booked_count" int NOT NULL DEFAULT 0,
        
        -- Fiyat (slot bazında override edilebilir)
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'TRY',
        
        -- Durum
        "status" varchar(20) NOT NULL DEFAULT 'available',
        -- status: 'available' | 'booked' | 'blocked' | 'cancelled'
        
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_schedule_slot_tenant_date" ON "schedule_slot"("tenant_id", "date");
      CREATE INDEX "idx_schedule_slot_service_date" ON "schedule_slot"("service_id", "date");
      CREATE INDEX "idx_schedule_slot_provider" ON "schedule_slot"("provider_type", "provider_id", "date");
      CREATE INDEX "idx_schedule_slot_status" ON "schedule_slot"("status") WHERE "status" = 'available';
    `);

    // ═══════════════════════════════════════════════════════════
    // 3. APPOINTMENT — Rezervasyonlar
    // ═══════════════════════════════════════════════════════════
    await qr.query(`
      CREATE TABLE "appointment" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "slot_id" uuid NOT NULL REFERENCES "schedule_slot"("id") ON DELETE CASCADE,
        "service_id" uuid NOT NULL REFERENCES "service_catalog"("id") ON DELETE CASCADE,
        
        -- Sağlayıcı (denormalize)
        "provider_type" varchar(50) NOT NULL,
        "provider_id" uuid,
        
        -- Durum
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        -- status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
        
        -- Ödeme
        "total_amount" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" varchar(3) NOT NULL DEFAULT 'TRY',
        "payment_status" varchar(30) NOT NULL DEFAULT 'pending',
        -- payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
        "payment_method" varchar(30),
        -- payment_method: 'cash' | 'card' | 'package' | 'transfer'
        
        -- Paket kullanımı (opsiyonel)
        "package_id" uuid,
        
        -- Notlar
        "notes" text,
        "admin_note" text,
        
        -- İptal
        "cancelled_at" timestamptz,
        "cancelled_by" varchar(50),
        "cancel_reason" text,
        
        -- Katılımcılar (grup dersleri için)
        "participant_count" int NOT NULL DEFAULT 1,
        "participants" jsonb,
        
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX "idx_appointment_tenant" ON "appointment"("tenant_id");
      CREATE INDEX "idx_appointment_user" ON "appointment"("user_id");
      CREATE INDEX "idx_appointment_slot" ON "appointment"("slot_id");
      CREATE INDEX "idx_appointment_service" ON "appointment"("service_id");
      CREATE INDEX "idx_appointment_provider" ON "appointment"("provider_type", "provider_id");
      CREATE INDEX "idx_appointment_status" ON "appointment"("status");
      CREATE INDEX "idx_appointment_date" ON "appointment"("tenant_id", "created_at" DESC);
    `);
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "appointment" CASCADE;`);
    await qr.query(`DROP TABLE IF EXISTS "schedule_slot" CASCADE;`);
    await qr.query(`DROP TABLE IF EXISTS "service_catalog" CASCADE;`);
  }
}
