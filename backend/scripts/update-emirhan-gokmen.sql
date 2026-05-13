UPDATE trainer SET
  bio = '6 yılı aşkın süredir fitness sektöründe aktif olarak çalışan Emirhan Gökmen, birebir kişisel antrenman (PT) ve grup antrenman sistemleri üzerine uzmanlaşmış profesyonel bir eğitmendir. Antrenörlük yaklaşımını yalnızca fiziksel değişim odaklı değil; performans, fonksiyonellik ve sürdürülebilir sağlık temelleri üzerine inşa etmektedir.

Bilimsel temelli antrenman sistemleriyle üyelerinin biyomekanik kapasitelerini geliştirmeyi hedefleyen Gökmen, kişiye özel planlama ve ölçülebilir gelişim süreçleriyle çalışmaktadır. Her bireyin fiziksel yapısına, yaşam tarzına ve hedeflerine uygun programlar oluşturarak maksimum verimlilik sağlamayı amaçlar.

Antrenman sistemi; sürdürülebilir sağlık, doğru hareket mekanikleri ve performans gelişimi üzerine kuruludur. Kas dengesizliklerini analiz ederek kişiye özel düzeltici egzersiz protokolleri oluşturur. Progressive overload prensibini bilimsel antrenman ve beslenme stratejileriyle birleştirir.',
  specializations = '["Postür Analizi & Düzeltici Egzersizler","Hipertrofi (Kas Gelişimi)","Kuvvet & Kondisyon","Fonksiyonel Antrenman","Mobilite & Stabilite","Personal Training","Beslenme Planlama"]'::jsonb,
  certifications = '["İstanbul Gelişim Üniversitesi — Spor Yönetimi","FMI – EREPS EQF Level 4 Personal Trainer","TVGFBF 1. Kademe Antrenörlük Belgesi"]'::jsonb
WHERE id = '40000004-0000-4000-8000-000000000001';

UPDATE trainer_profile SET
  bio = '6 yılı aşkın süredir fitness sektöründe aktif olarak çalışan Emirhan Gökmen, birebir kişisel antrenman (PT) ve grup antrenman sistemleri üzerine uzmanlaşmış profesyonel bir eğitmendir. Antrenörlük yaklaşımını yalnızca fiziksel değişim odaklı değil; performans, fonksiyonellik ve sürdürülebilir sağlık temelleri üzerine inşa etmektedir.

Bilimsel temelli antrenman sistemleriyle üyelerinin biyomekanik kapasitelerini geliştirmeyi hedefleyen Gökmen, kişiye özel planlama ve ölçülebilir gelişim süreçleriyle çalışmaktadır. Her bireyin fiziksel yapısına, yaşam tarzına ve hedeflerine uygun programlar oluşturarak maksimum verimlilik sağlamayı amaçlar.

Antrenman sistemi; sürdürülebilir sağlık, doğru hareket mekanikleri ve performans gelişimi üzerine kuruludur. Kas dengesizliklerini analiz ederek kişiye özel düzeltici egzersiz protokolleri oluşturur. Progressive overload prensibini bilimsel antrenman ve beslenme stratejileriyle birleştirir.',
  specialties = ARRAY['Postür Analizi & Düzeltici Egzersizler','Hipertrofi (Kas Gelişimi)','Kuvvet & Kondisyon','Fonksiyonel Antrenman','Mobilite & Stabilite','Personal Training','Beslenme Planlama'],
  certifications = ARRAY['İstanbul Gelişim Üniversitesi — Spor Yönetimi','FMI – EREPS EQF Level 4 Personal Trainer','TVGFBF 1. Kademe Antrenörlük Belgesi']
WHERE trainer_id = '40000004-0000-4000-8000-000000000001';
