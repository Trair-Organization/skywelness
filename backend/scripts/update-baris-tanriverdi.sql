UPDATE trainer SET
  bio = '1999 yılında kickboks ile spor kariyerine başlayan Barış Tanrıverdiler, yıllardır kickboks, boks, yakın savunma ve fitness alanlarında aktif olarak çalışmalarını sürdürmekte ve profesyonel antrenörlük yapmaktadır. Sporculuk kariyeri boyunca Türkiye şampiyonaları, İstanbul şampiyonaları ve dünya kupalarında önemli dereceler ve şampiyonluklar elde etmiştir.

2018 yılında kendi spor kulübünü kuran Tanrıverdiler, aynı zamanda Skyland Wellness bünyesinde birebir kickboks, boks ve fitness eğitimleri vermektedir. Başlangıç seviyesinden ileri seviyeye kadar her yaş grubuna özel programlar hazırlayarak hedef odaklı antrenman sistemleri uygulamaktadır.

Antrenman yaklaşımında performans gelişimi, doğru teknik, sürdürülebilir antrenman disiplini ve motivasyon ön plandadır. Amacı; danışanlarının yalnızca fiziksel gelişimlerini değil, aynı zamanda disiplin, özgüven ve yaşam kalitelerini de artırmalarına destek olmaktır.',
  specializations = '["Kickboks","Boks","Yakın Savunma","Fitness & Kondisyon","Birebir Özel Ders","Performans Gelişimi"]'::jsonb,
  certifications = '["Kickboks 3. Kademe Kıdemli Antrenör","Kickboks 4. Dan Siyah Kuşak","Fitness 1. Kademe Antrenör"]'::jsonb
WHERE id = '50000005-0000-4000-8000-000000000001';

UPDATE trainer_profile SET
  bio = '1999 yılında kickboks ile spor kariyerine başlayan Barış Tanrıverdiler, yıllardır kickboks, boks, yakın savunma ve fitness alanlarında aktif olarak çalışmalarını sürdürmekte ve profesyonel antrenörlük yapmaktadır. Sporculuk kariyeri boyunca Türkiye şampiyonaları, İstanbul şampiyonaları ve dünya kupalarında önemli dereceler ve şampiyonluklar elde etmiştir.

2018 yılında kendi spor kulübünü kuran Tanrıverdiler, aynı zamanda Skyland Wellness bünyesinde birebir kickboks, boks ve fitness eğitimleri vermektedir. Başlangıç seviyesinden ileri seviyeye kadar her yaş grubuna özel programlar hazırlayarak hedef odaklı antrenman sistemleri uygulamaktadır.

Antrenman yaklaşımında performans gelişimi, doğru teknik, sürdürülebilir antrenman disiplini ve motivasyon ön plandadır. Amacı; danışanlarının yalnızca fiziksel gelişimlerini değil, aynı zamanda disiplin, özgüven ve yaşam kalitelerini de artırmalarına destek olmaktır.',
  specialties = ARRAY['Kickboks','Boks','Yakın Savunma','Fitness & Kondisyon','Birebir Özel Ders','Performans Gelişimi'],
  certifications = ARRAY['Kickboks 3. Kademe Kıdemli Antrenör','Kickboks 4. Dan Siyah Kuşak','Fitness 1. Kademe Antrenör']
WHERE trainer_id = '50000005-0000-4000-8000-000000000001';
