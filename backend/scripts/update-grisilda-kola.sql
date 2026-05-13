UPDATE trainer SET
  bio = 'Grisilda Kola''nın spor yolculuğu 2009 yılında federasyona bağlı sportif latin dansları ile başlamıştır. Milli sporcu olma hedefiyle çıktığı bu yolculuk; disiplin, beden farkındalığı ve hareket kontrolü konularında güçlü bir temel oluşturmuş, sporu hayatının merkezine taşımıştır.

2016 yılından itibaren profesyonel olarak spor sektöründe aktif şekilde çalışan Grisilda Kola, akademik eğitimini İstanbul Üniversitesi Spor Bilimleri Fakültesi Egzersiz ve Spor Bilimleri bölümünde tamamlayarak kariyerini bilimsel temeller üzerine inşa etmiştir. Fitness, pilates ve yoga alanlarındaki uzmanlığını; fonksiyonel hareket sistemleri, kuvvet antrenmanları ve postür düzeltici egzersizlerle birleştirerek danışanlarına bütünsel bir yaklaşım sunmaktadır.

Antrenman planlamalarında bireyin anatomik yapısını, hareket kapasitesini ve günlük yaşam alışkanlıklarını analiz ederek tamamen kişiye özel programlar oluşturmaktadır. Özellikle bel ve boyun fıtığı, diz zayıflıkları, omurga sağlığı problemleri ve travmatik yaralanmalar sonrası güçlenme süreçlerinde güvenli ve etkili egzersiz modelleri üzerine yoğunlaşmaktadır.',
  specializations = '["Fitness & Personal Training","Pilates","Yoga","Kuvvet Antrenmanları","Postür Analizi & Düzeltici Egzersizler","Fonksiyonel Antrenman","Nöro-Kas Koordinasyon Gelişimi","Kadınlara Özel Alt Vücut & Glute Programları","Omurga Sağlığı & Mobilite"]'::jsonb,
  certifications = '["İstanbul Üniversitesi Spor Bilimleri Fakültesi — Egzersiz ve Spor Bilimleri","Sportif Latin Dansları Lisanslı Sporcu","Diz Stabilitesi ve Travmatik Yaralanmalar Uzmanlık Eğitimi","Fitness, Pilates ve Yoga Profesyonel Eğitimler"]'::jsonb
WHERE id = '10000001-0000-4000-8000-000000000001';

UPDATE trainer_profile SET
  bio = 'Grisilda Kola''nın spor yolculuğu 2009 yılında federasyona bağlı sportif latin dansları ile başlamıştır. Milli sporcu olma hedefiyle çıktığı bu yolculuk; disiplin, beden farkındalığı ve hareket kontrolü konularında güçlü bir temel oluşturmuş, sporu hayatının merkezine taşımıştır.

2016 yılından itibaren profesyonel olarak spor sektöründe aktif şekilde çalışan Grisilda Kola, akademik eğitimini İstanbul Üniversitesi Spor Bilimleri Fakültesi Egzersiz ve Spor Bilimleri bölümünde tamamlayarak kariyerini bilimsel temeller üzerine inşa etmiştir. Fitness, pilates ve yoga alanlarındaki uzmanlığını; fonksiyonel hareket sistemleri, kuvvet antrenmanları ve postür düzeltici egzersizlerle birleştirerek danışanlarına bütünsel bir yaklaşım sunmaktadır.

Antrenman planlamalarında bireyin anatomik yapısını, hareket kapasitesini ve günlük yaşam alışkanlıklarını analiz ederek tamamen kişiye özel programlar oluşturmaktadır. Özellikle bel ve boyun fıtığı, diz zayıflıkları, omurga sağlığı problemleri ve travmatik yaralanmalar sonrası güçlenme süreçlerinde güvenli ve etkili egzersiz modelleri üzerine yoğunlaşmaktadır.',
  specialties = ARRAY['Fitness & Personal Training','Pilates','Yoga','Kuvvet Antrenmanları','Postür Analizi & Düzeltici Egzersizler','Fonksiyonel Antrenman','Nöro-Kas Koordinasyon Gelişimi','Kadınlara Özel Alt Vücut & Glute Programları','Omurga Sağlığı & Mobilite'],
  certifications = ARRAY['İstanbul Üniversitesi Spor Bilimleri Fakültesi — Egzersiz ve Spor Bilimleri','Sportif Latin Dansları Lisanslı Sporcu','Diz Stabilitesi ve Travmatik Yaralanmalar Uzmanlık Eğitimi','Fitness, Pilates ve Yoga Profesyonel Eğitimler']
WHERE trainer_id = '10000001-0000-4000-8000-000000000001';
