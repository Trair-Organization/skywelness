import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Faz 6: Eski rezervasyon tablolarını deprecated olarak işaretle.
 * 
 * SILINMEZ — Mobil uygulama hâlâ bu tabloları kullanıyor.
 * Sadece comment eklenip, v2 sistemine geçiş belgelenir.
 * 
 * Deprecated tablolar:
 * - time_slot       → schedule_slot (v2) ile değiştirildi
 * - availability    → schedule_slot (v2) ile değiştirildi
 * - resource_slot   → schedule_slot (v2) ile değiştirildi (kort/oda için)
 * - booking         → appointment (v2) ile değiştirildi
 * - spa_booking     → appointment (v2) ile değiştirildi
 * 
 * Korunan tablolar:
 * - reservation     → Mobil uygulama aktif kullanımda (23 kayıt)
 * - package         → Tüm sistemler kullanıyor
 * - package_type    → Tüm sistemler kullanıyor
 */
export class DeprecateOldBookingTables1778600000000 implements MigrationInterface {
  public async up(qr: QueryRunner): Promise<void> {
    // Tablolara comment ekle (silme değil, işaretleme)
    await qr.query(`COMMENT ON TABLE "time_slot" IS 'DEPRECATED: Use schedule_slot (v2). Kept for mobile app backward compatibility.'`);
    await qr.query(`COMMENT ON TABLE "availability" IS 'DEPRECATED: Use schedule_slot (v2). Kept for mobile app backward compatibility.'`);
    await qr.query(`COMMENT ON TABLE "resource_slot" IS 'DEPRECATED: Use schedule_slot (v2). Kept for O''Padel resource booking backward compatibility.'`);
    await qr.query(`COMMENT ON TABLE "booking" IS 'DEPRECATED: Use appointment (v2). Kept for backward compatibility.'`);
    await qr.query(`COMMENT ON TABLE "spa_booking" IS 'DEPRECATED: Use appointment (v2). Kept for backward compatibility.'`);
    
    // v2 tablolarına açıklama ekle
    await qr.query(`COMMENT ON TABLE "service_catalog" IS 'v2 Unified Booking: Hizmet kataloğu. Tüm sektörler için.'`);
    await qr.query(`COMMENT ON TABLE "schedule_slot" IS 'v2 Unified Booking: Müsaitlik slotları. time_slot + resource_slot + availability yerine.'`);
    await qr.query(`COMMENT ON TABLE "appointment" IS 'v2 Unified Booking: Rezervasyonlar. booking + spa_booking yerine.'`);
    
    console.log('✅ Faz 6: Eski tablolar deprecated olarak işaretlendi.');
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`COMMENT ON TABLE "time_slot" IS NULL`);
    await qr.query(`COMMENT ON TABLE "availability" IS NULL`);
    await qr.query(`COMMENT ON TABLE "resource_slot" IS NULL`);
    await qr.query(`COMMENT ON TABLE "booking" IS NULL`);
    await qr.query(`COMMENT ON TABLE "spa_booking" IS NULL`);
    await qr.query(`COMMENT ON TABLE "service_catalog" IS NULL`);
    await qr.query(`COMMENT ON TABLE "schedule_slot" IS NULL`);
    await qr.query(`COMMENT ON TABLE "appointment" IS NULL`);
  }
}
