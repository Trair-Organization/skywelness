UPDATE trainer SET
  bio = 'Spor kariyerine çocuk yaşlarda futbol ile başlayan Baha Çıtır, 16 yılı aşkın süredir aktif olarak futbol oynamakta ve sporun farklı disiplinlerinde kendini geliştirmektedir. 2024 yılında İstanbul Sabahattin Zaim Üniversitesi Beden Eğitimi ve Spor Öğretmenliği bölümünden mezun olmuş, aynı yıldan itibaren profesyonel olarak fitness antrenörlüğü yapmaya başlamıştır.

Sporcu geçmişinden gelen disiplin, takım ruhu ve performans odaklı yaklaşımını antrenörlük kariyerine taşıyan Baha Çıtır, özellikle atletik performans gelişimi ve futbol odaklı kondisyon çalışmalarında uzmanlaşmaktadır.

Enerjik yapısı, güçlü iletişim becerileri ve motivasyon odaklı çalışma sistemi sayesinde danışanlarının spor sürecini hem verimli hem de sürdürülebilir hale getirmeyi hedeflemektedir.',
  specializations = '["Fitness & Personal Training","Atletik Performans Gelişimi","Futbol Kondisyonu","Kuvvet & Dayanıklılık Antrenmanları","Fonksiyonel Antrenman","Mobilite & Hareket Kalitesi"]'::jsonb,
  certifications = '["İstanbul Sabahattin Zaim Üniversitesi — Beden Eğitimi ve Spor Öğretmenliği","Kademe Fitness Antrenörlüğü Belgesi","Atletik Performans Uzmanlık Eğitimleri","Futbol Performans Eğitimleri"]'::jsonb
WHERE id = '20000002-0000-4000-8000-000000000001';

UPDATE trainer_profile SET
  bio = 'Spor kariyerine çocuk yaşlarda futbol ile başlayan Baha Çıtır, 16 yılı aşkın süredir aktif olarak futbol oynamakta ve sporun farklı disiplinlerinde kendini geliştirmektedir. 2024 yılında İstanbul Sabahattin Zaim Üniversitesi Beden Eğitimi ve Spor Öğretmenliği bölümünden mezun olmuş, aynı yıldan itibaren profesyonel olarak fitness antrenörlüğü yapmaya başlamıştır.

Sporcu geçmişinden gelen disiplin, takım ruhu ve performans odaklı yaklaşımını antrenörlük kariyerine taşıyan Baha Çıtır, özellikle atletik performans gelişimi ve futbol odaklı kondisyon çalışmalarında uzmanlaşmaktadır.

Enerjik yapısı, güçlü iletişim becerileri ve motivasyon odaklı çalışma sistemi sayesinde danışanlarının spor sürecini hem verimli hem de sürdürülebilir hale getirmeyi hedeflemektedir.',
  specialties = ARRAY['Fitness & Personal Training','Atletik Performans Gelişimi','Futbol Kondisyonu','Kuvvet & Dayanıklılık Antrenmanları','Fonksiyonel Antrenman','Mobilite & Hareket Kalitesi'],
  certifications = ARRAY['İstanbul Sabahattin Zaim Üniversitesi — Beden Eğitimi ve Spor Öğretmenliği','Kademe Fitness Antrenörlüğü Belgesi','Atletik Performans Uzmanlık Eğitimleri','Futbol Performans Eğitimleri']
WHERE trainer_id = '20000002-0000-4000-8000-000000000001';
