UPDATE tenant SET
  logo_url = 'https://www.wellnessclub.tech/uploads/opadel-logo.png',
  cover_image_url = 'https://www.wellnessclub.tech/uploads/opadel-1.jpg',
  gallery_images = '["https://www.wellnessclub.tech/uploads/opadel-1.jpg","https://www.wellnessclub.tech/uploads/opadel-2.jpg","https://www.wellnessclub.tech/uploads/opadel-3.webp","https://www.wellnessclub.tech/uploads/opadel-4.jpg","https://www.wellnessclub.tech/uploads/opadel-5.jpg"]'::jsonb,
  description = 'İstanbul Maslak''ta bulunan O''Padel, 5 adet profesyonel padel kortu ile hizmet vermektedir. Yeni başlayanlardan ileri seviyeye kadar her seviyede oyuncuya uygun kortlar, profesyonel ekipman kiralama ve sosyal padel etkinlikleri sunuyoruz. Arkadaşlarınızla keyifli bir maç için hemen kort ayırtın!',
  location = 'Maslak, Sarıyer, İstanbul',
  services = ARRAY['Padel', 'Kort Kiralama', 'Ekipman Kiralama', 'Özel Ders', 'Turnuva', 'Sosyal Etkinlik'],
  price_range = '₺2.500 - ₺4.500 / saat'
WHERE subdomain = 'opadel';
