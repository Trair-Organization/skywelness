-- Skyland Wellness Spa & Massage Real Data
-- Tenant ID: 00000000-0000-4000-8000-000000000002

-- ═══════════════════════════════════════════════════════════════════════════════
-- SPA SERVICES (Masaj Türleri + Cold Plunge)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO spa_service (tenant_id, name, description, category, duration_minutes, price, benefits, sort_order) VALUES
('00000000-0000-4000-8000-000000000002', 'Face Massage',
 'Yüz kaslarını rahatlatarak cilt dolaşımını artıran, yaşlanma karşıtı etkileriyle bilinen özel yüz masajı. Lenfatik drenaj teknikleriyle ödem giderici, parlaklık artırıcı.',
 'therapy', 30, 2500, '["Cilt yenilenmesi","Ödem giderme","Lenfatik drenaj","Anti-aging etki"]', 1),

('00000000-0000-4000-8000-000000000002', 'Foot Massage',
 'Ayak refleksolojisi ile tüm vücudu etkileyen derin rahatlama. Akupresür noktalarına uygulanan basınçla enerji akışını dengeleyerek stres ve yorgunluğu giderir.',
 'therapy', 40, 2600, '["Refleksoloji","Stres giderme","Kan dolaşımı","Enerji dengeleme"]', 2),

('00000000-0000-4000-8000-000000000002', 'Classic Massage',
 'İsveç masaj tekniklerinin temelini oluşturan klasik masaj. Uzun, akıcı hareketlerle kas gerginliğini çözer, kan dolaşımını hızlandırır ve derin bir rahatlama sağlar.',
 'relax', 50, 3000, '["Kas gevşetme","Kan dolaşımı","Stres azaltma","Genel rahatlama"]', 3),

('00000000-0000-4000-8000-000000000002', 'Cellulite Massage',
 'Selülit görünümünü azaltmaya yönelik özel tekniklerle uygulanan yoğun masaj. Doku altı yağ birikimlerini hedefleyerek cilt dokusunu düzeltir ve lenfatik sistemi aktive eder.',
 'therapy', 50, 3000, '["Selülit azaltma","Lenfatik aktivasyon","Cilt sıkılaştırma","Dolaşım artışı"]', 4),

('00000000-0000-4000-8000-000000000002', 'Sport Massage',
 'Sporcu performansını artırmaya ve toparlanmayı hızlandırmaya yönelik derin doku masajı. Kas liflerindeki gerginliği çözer, esnekliği artırır ve sakatlanma riskini azaltır.',
 'sport', 50, 3000, '["Kas toparlanması","Esneklik artışı","Performans desteği","Sakatlanma önleme"]', 5),

('00000000-0000-4000-8000-000000000002', 'Aroma Therapy Massage',
 'Terapötik esansiyel yağlarla zenginleştirilmiş bütünsel masaj deneyimi. Lavanta, okaliptüs ve bergamot gibi doğal yağların iyileştirici gücünü derin masaj teknikleriyle birleştirir.',
 'relax', 60, 3200, '["Aromaterapi","Zihinsel rahatlama","Uyku kalitesi","Bağışıklık desteği"]', 6),

('00000000-0000-4000-8000-000000000002', 'Bali Massage',
 'Endonezya geleneksel masaj sanatından ilham alan Bali masajı. Akupresür, refleksoloji ve derin doku tekniklerini harmanlayarak vücudu bütünsel olarak yeniler.',
 'relax', 60, 3000, '["Bali tekniği","Akupresür","Enerji dengeleme","Bütünsel yenilenme"]', 7),

('00000000-0000-4000-8000-000000000002', 'Recovery Massage',
 'Yoğun antrenman sonrası kas toparlanmasını hızlandıran restoratif masaj. Miyofasyal gevşetme ve trigger point teknikleriyle derin kas katmanlarına ulaşır.',
 'recovery', 60, 3200, '["Miyofasyal gevşetme","Trigger point","Hızlı toparlanma","Laktik asit atılımı"]', 8),

('00000000-0000-4000-8000-000000000002', 'Hot Stone Massage',
 'Volkanik bazalt taşlarının derin ısısıyla kas dokusuna nüfuz eden premium masaj. Sıcak taşlar meridyen noktalarına yerleştirilerek enerji blokajlarını çözer ve derin bir huzur sağlar.',
 'premium', 75, 3800, '["Sıcak taş terapisi","Derin kas gevşemesi","Meridyen dengeleme","Premium deneyim"]', 9),

('00000000-0000-4000-8000-000000000002', 'Sultan Massage',
 'Osmanlı hamam geleneğinden ilham alan en kapsamlı wellness ritüeli. Kese, köpük, bal maskesi ve derin masajı bir arada sunan 90 dakikalık imza deneyimimiz.',
 'premium', 90, 5000, '["Kese & köpük","Bal maskesi","Derin masaj","Osmanlı ritüeli","VIP deneyim"]', 10),

('00000000-0000-4000-8000-000000000002', 'Cold Plunge — Tek Seans',
 'Buz banyosu ile metabolizmayı hızlandıran, bağışıklığı güçlendiren ve zihinsel netliği artıran soğuk su terapisi. 3-5 dakika kontrollü soğuk suya dalış.',
 'cold', 15, 600, '["Metabolizma hızlandırma","Bağışıklık güçlendirme","Zihinsel netlik","İnflamasyon azaltma"]', 11),

('00000000-0000-4000-8000-000000000002', 'Cold Plunge — Aylık Üyelik',
 'Sınırsız cold plunge erişimi. Her gün buz banyosu yaparak vücudunuzu dönüştürün. Düzenli kullanımda uyku kalitesi, enerji seviyesi ve toparlanma hızı belirgin şekilde artar.',
 'cold', 15, 7000, '["Sınırsız erişim","Günlük kullanım","Düzenli adaptasyon","Maksimum fayda"]', 12);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SPA THERAPISTS (Masözler)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO spa_therapist (tenant_id, name, bio, specialties, working_hours) VALUES
('00000000-0000-4000-8000-000000000002', 'Vinda',
 'Bali ve Uzak Doğu masaj tekniklerinde uzmanlaşmış deneyimli terapist. Aromaterapi ve sıcak taş uygulamalarında sertifikalı.',
 '{"Classic Massage","Bali Massage","Aroma Therapy Massage","Hot Stone Massage"}',
 '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"10:00-18:00"}'),

('00000000-0000-4000-8000-000000000002', 'Tari',
 'Spor masajı ve recovery alanında uzman terapist. Sporcu performansı ve toparlanma odaklı derin doku teknikleri.',
 '{"Sport Massage","Recovery Massage","Classic Massage","Cellulite Massage"}',
 '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"10:00-18:00"}'),

('00000000-0000-4000-8000-000000000002', 'Nari',
 'Yüz bakımı ve refleksoloji uzmanı. Lenfatik drenaj ve anti-aging masaj tekniklerinde sertifikalı.',
 '{"Face Massage","Foot Massage","Aroma Therapy Massage","Sultan Massage"}',
 '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"10:00-18:00"}'),

('00000000-0000-4000-8000-000000000002', 'Dani',
 'Geleneksel ve modern masaj tekniklerini harmanlayan çok yönlü terapist. Sultan masajı ve hamam ritüellerinde uzman.',
 '{"Sultan Massage","Hot Stone Massage","Bali Massage","Classic Massage"}',
 '{"mon":"10:00-20:00","tue":"10:00-20:00","wed":"10:00-20:00","thu":"10:00-20:00","fri":"10:00-20:00","sat":"10:00-18:00"}');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SPA PACKAGES (Masaj Paketleri)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO spa_package (tenant_id, name, description, session_count, price, validity_days, applicable_categories, sort_order) VALUES
('00000000-0000-4000-8000-000000000002', '5 Seans Masaj Paketi',
 '5 seans masaj hakkı. Tüm masaj türlerinde geçerlidir. 60 gün geçerlilik.',
 5, 12000, 60, '{"relax","therapy","recovery","sport","premium"}', 1),

('00000000-0000-4000-8000-000000000002', '10 Seans Masaj Paketi',
 '10 seans masaj hakkı. Tüm masaj türlerinde geçerlidir. 90 gün geçerlilik. En popüler paket.',
 10, 18000, 90, '{"relax","therapy","recovery","sport","premium"}', 2),

('00000000-0000-4000-8000-000000000002', '20 Seans Masaj Paketi',
 '20 seans masaj hakkı. Tüm masaj türlerinde geçerlidir. 180 gün geçerlilik. En avantajlı paket.',
 20, 30000, 180, '{"relax","therapy","recovery","sport","premium"}', 3);
