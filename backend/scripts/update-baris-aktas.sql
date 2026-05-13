UPDATE trainer SET
  bio = 'Barış Aktaş, Spor Bilimleri Fakültesi Antrenörlük Bölümü öğrencisi olup yaklaşık 8 yıldır kickboks, boks ve fitness branşlarında aktif olarak çalışmalarını sürdürmektedir. Aynı zamanda kickboks branşında aktif müsabık sporcu olarak kariyerine devam etmekte ve sporun hem akademik hem performans tarafında kendini sürekli geliştirmektedir.

Çocukluk yıllarından itibaren sporun içerisinde yer alan Aktaş, farklı branşlarda edindiği deneyimler sayesinde hareket gelişimi, koordinasyon, atletik performans ve çok yönlü antrenman sistemleri konusunda güçlü bir altyapı oluşturmuştur. Bu bilgi birikimini bireysel antrenman planlamaları ve performans gelişimi süreçlerinde profesyonel şekilde uygulamaktadır.

Spor biliminin temel prensiplerini esas alarak kişiye özel antrenman programları oluşturmaktadır. Kuvvet ve kondisyon gelişimi, dayanıklılık artışı, mobilite ve hareket kalitesi, teknik beceri gelişimi ve sürdürülebilir performans artışı gibi alanlara odaklanmaktadır.',
  specializations = '["Kickboks","Boks","Fitness & Personal Training","Atletik Performans Gelişimi","Kuvvet & Kondisyon","Dayanıklılık Antrenmanları","Mobilite & Hareket Kalitesi","Teknik Gelişim ve Performans Koçluğu"]'::jsonb,
  certifications = '["Kickboks Federasyonu Antrenörlük Belgesi","Fitness 1. Kademe Antrenörlük Belgesi","EQF Level 4 Personal Trainer","Kickboks 2. Dan Siyah Kuşak"]'::jsonb
WHERE id = '70000007-0000-4000-8000-000000000001';

UPDATE trainer_profile SET
  bio = 'Barış Aktaş, Spor Bilimleri Fakültesi Antrenörlük Bölümü öğrencisi olup yaklaşık 8 yıldır kickboks, boks ve fitness branşlarında aktif olarak çalışmalarını sürdürmektedir. Aynı zamanda kickboks branşında aktif müsabık sporcu olarak kariyerine devam etmekte ve sporun hem akademik hem performans tarafında kendini sürekli geliştirmektedir.

Çocukluk yıllarından itibaren sporun içerisinde yer alan Aktaş, farklı branşlarda edindiği deneyimler sayesinde hareket gelişimi, koordinasyon, atletik performans ve çok yönlü antrenman sistemleri konusunda güçlü bir altyapı oluşturmuştur. Bu bilgi birikimini bireysel antrenman planlamaları ve performans gelişimi süreçlerinde profesyonel şekilde uygulamaktadır.

Spor biliminin temel prensiplerini esas alarak kişiye özel antrenman programları oluşturmaktadır. Kuvvet ve kondisyon gelişimi, dayanıklılık artışı, mobilite ve hareket kalitesi, teknik beceri gelişimi ve sürdürülebilir performans artışı gibi alanlara odaklanmaktadır.',
  specialties = ARRAY['Kickboks','Boks','Fitness & Personal Training','Atletik Performans Gelişimi','Kuvvet & Kondisyon','Dayanıklılık Antrenmanları','Mobilite & Hareket Kalitesi','Teknik Gelişim ve Performans Koçluğu'],
  certifications = ARRAY['Kickboks Federasyonu Antrenörlük Belgesi','Fitness 1. Kademe Antrenörlük Belgesi','EQF Level 4 Personal Trainer','Kickboks 2. Dan Siyah Kuşak']
WHERE trainer_id = '70000007-0000-4000-8000-000000000001';
