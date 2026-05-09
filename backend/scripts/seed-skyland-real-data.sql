-- Skyland Wellness Real Data Seed
-- Tenant ID: 00000000-0000-4000-8000-000000000002

-- Mevcut mock eğitmenleri ve profillerini temizle (gerçek üyeleri koruyarak)
DELETE FROM trainer_profile WHERE tenant_id = '00000000-0000-4000-8000-000000000002';
DELETE FROM trainer WHERE tenant_id = '00000000-0000-4000-8000-000000000002';
DELETE FROM "user" WHERE tenant_id = '00000000-0000-4000-8000-000000000002' AND role = 'trainer';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PERSONAL TRAINERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Grisilda Kola
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a1000001-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'grisilda@skylandwellness.com', 'grisildakola',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Grisilda', 'Kola', '05412678591', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('10000001-0000-4000-8000-000000000001', 'a1000001-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Fitness, Pilates ve Yoga alanlarında uzmanlaşmış sertifikalı eğitmen. Bütünsel yaklaşımla vücut-zihin dengesini hedefler.',
  '["Fitness", "Pilates", "Yoga"]',
  '{"personal_training","massage"}',
  4.9, 320);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a1000001-0000-4000-8000-000000000001', '10000001-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Fitness, Pilates ve Yoga alanlarında uzmanlaşmış sertifikalı eğitmen. Bütünsel yaklaşımla vücut-zihin dengesini hedefler.',
  '{"Fitness","Pilates","Yoga"}', 8, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/grisildakola"]}');

-- 2. Baha Çıtır
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a2000002-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'baha@skylandwellness.com', 'ctrbaha',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Baha', 'Çıtır', '05402613179', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('20000002-0000-4000-8000-000000000001', 'a2000002-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Fitness ve Atletik Performans uzmanı. Fonksiyonel antrenman ve güç geliştirme odaklı programlar.',
  '["Fitness", "Atletik Performans"]',
  '{"personal_training"}',
  4.8, 450);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a2000002-0000-4000-8000-000000000001', '20000002-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Fitness ve Atletik Performans uzmanı. Fonksiyonel antrenman ve güç geliştirme odaklı programlar.',
  '{"Fitness","Atletik Performans"}', 6, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/ctrbaha"]}');

-- 3. Eren Kuyuk
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a3000003-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'eren@skylandwellness.com', 'merenkyk',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Eren', 'Kuyuk', '05511647469', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('30000003-0000-4000-8000-000000000001', 'a3000003-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Fitness alanında uzman kişisel antrenör. Hedef odaklı programlar ve beslenme danışmanlığı.',
  '["Fitness"]',
  '{"personal_training"}',
  4.7, 280);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a3000003-0000-4000-8000-000000000001', '30000003-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Fitness alanında uzman kişisel antrenör. Hedef odaklı programlar ve beslenme danışmanlığı.',
  '{"Fitness"}', 5, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/merenkyk"]}');

-- 4. Emirhan Gökmen
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a4000004-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'emirhan@skylandwellness.com', 'emirhangokman',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Emirhan', 'Gökmen', '05355269644', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('40000004-0000-4000-8000-000000000001', 'a4000004-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Fitness ve Corrective Exercise uzmanı. Postür düzeltme, rehabilitasyon ve fonksiyonel hareket eğitimi.',
  '["Fitness", "Corrective Exercise"]',
  '{"personal_training"}',
  4.9, 380);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a4000004-0000-4000-8000-000000000001', '40000004-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Fitness ve Corrective Exercise uzmanı. Postür düzeltme, rehabilitasyon ve fonksiyonel hareket eğitimi.',
  '{"Fitness","Corrective Exercise"}', 7, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/emirhangokman"]}');

-- ═══════════════════════════════════════════════════════════════════════════════
-- BOXING COACHES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 5. Barış Tanrıverdi
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a5000005-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'baris.t@skylandwellness.com', 'btanriverdiler',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Barış', 'Tanrıverdi', '05346121096', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('50000005-0000-4000-8000-000000000001', 'a5000005-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Kickboks ve Boks antrenörü. Teknik gelişim, kondisyon ve dövüş sporları eğitimi.',
  '["Kickboks", "Boks"]',
  '{"personal_training"}',
  4.8, 520);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a5000005-0000-4000-8000-000000000001', '50000005-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Kickboks ve Boks antrenörü. Teknik gelişim, kondisyon ve dövüş sporları eğitimi.',
  '{"Kickboks","Boks"}', 10, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/btanriverdiler"]}');

-- 6. Yaşar Mirran
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a6000006-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'yasar@skylandwellness.com', 'yashar_mrn',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Yaşar', 'Mirran', '05012786650', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('60000006-0000-4000-8000-000000000001', 'a6000006-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Kickboks ve Boks koçu. Yüksek tempolu antrenmanlar ve teknik mükemmellik odaklı çalışmalar.',
  '["Kickboks", "Boks"]',
  '{"personal_training"}',
  4.7, 410);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a6000006-0000-4000-8000-000000000001', '60000006-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Kickboks ve Boks koçu. Yüksek tempolu antrenmanlar ve teknik mükemmellik odaklı çalışmalar.',
  '{"Kickboks","Boks"}', 8, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/yashar_mrn"]}');

-- 7. Barış Aktaş
INSERT INTO "user" (id, tenant_id, email, username, password_hash, first_name, last_name, phone, role, account_status)
VALUES ('a7000007-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002',
  'baris.a@skylandwellness.com', 'barisaktass11',
  '$2b$12$LJ3a4FqGJ8K0X5v5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5',
  'Barış', 'Aktaş', '05365654662', 'trainer', 'active');

INSERT INTO trainer (id, user_id, tenant_id, bio, specializations, offers_session_types, avg_rating, total_sessions)
VALUES ('70000007-0000-4000-8000-000000000001', 'a7000007-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Kickboks, Boks ve Fitness antrenörü. Dövüş sporları tekniği ile fonksiyonel fitness birleştiren programlar.',
  '["Kickboks", "Boks", "Fitness"]',
  '{"personal_training"}',
  4.8, 350);

INSERT INTO trainer_profile (id, user_id, trainer_id, tenant_id, city, bio, specialties, experience_years, photo_url, pricing_note, social_links)
VALUES (uuid_generate_v4(), 'a7000007-0000-4000-8000-000000000001', '70000007-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002', 'İstanbul',
  'Kickboks, Boks ve Fitness antrenörü. Dövüş sporları tekniği ile fonksiyonel fitness birleştiren programlar.',
  '{"Kickboks","Boks","Fitness"}', 9, NULL, 'Seans başı ve paket seçenekleri mevcuttur.',
  '{"links":["https://instagram.com/barisaktass11"]}');

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONTHLY EVENTS (Mayıs 2026)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO club_event (id, tenant_id, title, description, coach_name, location, starts_at, ends_at, capacity, published)
VALUES
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Sunrise Yoga', 'Güne yoga ile başla. Açık havada nefes ve hareket.', 'Grisilda Kola', 'Skyland Teras',
   '2026-05-10 09:00:00+03', '2026-05-10 10:00:00+03', 20, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Volleyball Match', 'Rezidans sakinleri arası voleybol turnuvası.', NULL, 'Skyland Spor Alanı',
   '2026-05-13 19:00:00+03', '2026-05-13 21:00:00+03', 24, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Skywell Reset Weekend', '3 günlük wellness retreat. Yoga, meditasyon, spa ve beslenme atölyesi.', NULL, 'Skyland Wellness',
   '2026-05-15 10:00:00+03', '2026-05-17 18:00:00+03', 15, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Football Match', 'Halı saha futbol maçı. Takımlar kura ile belirlenir.', NULL, 'Skyland Halı Saha',
   '2026-05-20 21:00:00+03', '2026-05-20 22:30:00+03', 22, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Bebek Coastal Walk', 'Sabah yürüyüşü — Bebek sahil parkuru. Buluşma noktası: Skyland lobi.', NULL, 'Bebek Sahil',
   '2026-05-24 08:00:00+03', '2026-05-24 10:00:00+03', 30, true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- GROUP CLASSES (Haftalık)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO club_event (id, tenant_id, title, description, coach_name, location, starts_at, ends_at, capacity, published)
VALUES
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'YogaFit', 'Güç ve esneklik odaklı yoga dersi. Tüm seviyeler.', 'Grisilda Kola', 'Skyland Studio',
   '2026-05-12 19:15:00+03', '2026-05-12 20:15:00+03', 12, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Hyrox Training', 'Hyrox yarışmasına hazırlık antrenmanı. Yüksek yoğunluk.', 'Emirhan Gökmen', 'Skyland Gym',
   '2026-05-13 19:30:00+03', '2026-05-13 20:30:00+03', 10, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Move Strong', 'Fonksiyonel güç ve hareket kalitesi dersi.', 'Barış Tanrıverdi', 'Skyland Gym',
   '2026-05-15 19:30:00+03', '2026-05-15 20:30:00+03', 10, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Full Body HIIT', 'Tüm vücut yüksek yoğunluklu interval antrenmanı.', 'Yaşar Mirran', 'Skyland Gym',
   '2026-05-16 19:30:00+03', '2026-05-16 20:30:00+03', 12, true),
  (uuid_generate_v4(), '00000000-0000-4000-8000-000000000002',
   'Mobility Group Class', 'Eklem sağlığı, esneklik ve hareket açıklığı dersi.', 'Baha Çıtır', 'Skyland Studio',
   '2026-05-17 19:00:00+03', '2026-05-17 20:00:00+03', 12, true);
