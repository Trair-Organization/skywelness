# Görev Listesi — Eğitmen Paneli (Trainer Panel)

## Faz 1: Backend Altyapı

### Task 1: Migration — Reservation ve TrainerMemberLink yeni alanlar

- [ ] `reservation` tablosuna `cancelled_by`, `cancel_reason`, `reschedule_note` alanları ekle
- [ ] `trainer_member_link` tablosuna `source` alanı ekle
- [ ] Migration dosyası oluştur ve çalıştır

### Task 2: TrainerPanel Module + Controller + Service

- [ ] `backend/src/trainer-panel/trainer-panel.module.ts` oluştur
- [ ] `backend/src/trainer-panel/trainer-panel.controller.ts` oluştur (tüm endpoint'ler)
- [ ] `backend/src/trainer-panel/trainer-panel.service.ts` oluştur (iş mantığı)
- [ ] `AppModule`'e import et
- [ ] RolesGuard ile trainer/independent_trainer kısıtlaması

### Task 3: Dashboard Endpoint

- [ ] `GET /trainer-panel/dashboard` — bugünkü ders sayısı, haftalık, aylık istatistikler
- [ ] Okunmamış mesaj sayısı (MessagingService'den)
- [ ] Aktif öğrenci sayısı
- [ ] Bugünkü ders mini listesi

### Task 4: Takvim & Müsaitlik Endpoint'leri

- [ ] `GET /trainer-panel/calendar?from=&to=` — müsaitlik + dersler birleşik
- [ ] `POST /trainer-panel/availability` — tek slot oluştur
- [ ] `POST /trainer-panel/availability/bulk` — toplu slot (haftalık tekrar)
- [ ] `PATCH /trainer-panel/availability/:id` — slot düzenle
- [ ] `DELETE /trainer-panel/availability/:id` — slot sil (ders kontrolü ile)

### Task 5: Öğrenci Yönetimi Endpoint'leri

- [ ] `GET /trainer-panel/students` — aktif öğrenci listesi
- [ ] `GET /trainer-panel/students/:userId` — öğrenci detay (notlar, paketler, geçmiş)
- [ ] `POST /trainer-panel/students/add-external` — dış öğrenci ekle
- [ ] `DELETE /trainer-panel/students/:userId` — öğrenci arşivle
- [ ] `GET /trainer-panel/students/:userId/notes` — notlar
- [ ] `POST /trainer-panel/students/:userId/notes` — not ekle
- [ ] `GET /trainer-panel/students/:userId/history` — geçmiş dersler
- [ ] `GET /trainer-panel/students/:userId/packages` — paket durumu

### Task 6: Ders Yönetimi Endpoint'leri

- [ ] `POST /trainer-panel/lessons` — manuel ders ekle
- [ ] `POST /trainer-panel/lessons/:id/cancel` — ders iptal (neden + bildirim)
- [ ] `POST /trainer-panel/lessons/:id/reschedule` — ders ertele (yeni slot + bildirim)
- [ ] `GET /trainer-panel/lessons?date=&view=` — ders programı

### Task 7: Profil Endpoint'leri

- [ ] `GET /trainer-panel/profile` — profil bilgileri
- [ ] `PATCH /trainer-panel/profile` — profil güncelle (bio, specialties, certifications, photo, pricing)

### Task 8: Bildirim Entegrasyonu

- [ ] Ders iptal bildirimi (öğrenciye push)
- [ ] Ders erteleme bildirimi (öğrenciye push)
- [ ] Manuel ders ekleme bildirimi (öğrenciye push)
- [ ] Yeni öğrenci bağlantı bildirimi (eğitmene push)
- [ ] Sabah 08:00 günlük özet (mevcut cron genişlet)
- [ ] T-1h hatırlatma (eğitmen + öğrenci)

## Faz 2: Mobil Uygulama — Eğitmen Navigasyonu

### Task 9: TrainerTabNavigator

- [ ] `mobile-expo/src/navigation/TrainerTabNavigator.tsx` oluştur
- [ ] 5 tab: Panel, Takvim, Öğrenciler, Mesajlar, Profil
- [ ] `RootNavigator.tsx`'de rol bazlı routing (trainer → TrainerTabNavigator)
- [ ] Navigation types tanımla

### Task 10: TrainerDashboardScreen

- [ ] Dashboard ekranı (istatistik kartları)
- [ ] Bugünkü ders mini listesi
- [ ] Hızlı erişim butonları (takvim, öğrenciler, mesajlar)
- [ ] Pull-to-refresh

## Faz 3: Mobil — Takvim

### Task 11: TrainerCalendarScreen

- [ ] Haftalık/günlük görünüm toggle
- [ ] Müsaitlik slotları görsel (boş: yeşil, dolu: mavi)
- [ ] Slot'a tıklama → ders detay veya "Ders Ekle"
- [ ] "Slot Ekle" butonu + form (tarih, saat)
- [ ] "Toplu Slot Oluştur" butonu + haftalık tekrar formu
- [ ] Slot silme (ders kontrolü ile uyarı)

### Task 12: Ders Ekleme Modal

- [ ] Öğrenci seçimi (dropdown — bağlı öğrenciler)
- [ ] Ders tipi seçimi
- [ ] Not alanı
- [ ] Kaydet → API call + bildirim

### Task 13: Ders İptal/Erteleme

- [ ] Ders detay ekranında "İptal Et" butonu
- [ ] İptal nedeni input + onay dialog
- [ ] "İleri Tarihe Al" butonu
- [ ] Boş slot seçim ekranı (erteleme için)
- [ ] API call + bildirim

## Faz 4: Mobil — Öğrenciler

### Task 14: TrainerStudentsScreen

- [ ] Öğrenci listesi (avatar, ad, son ders, kaynak badge)
- [ ] Arama çubuğu
- [ ] "Dış Öğrenci Ekle" butonu + form
- [ ] Boş durum mesajı

### Task 15: TrainerStudentDetailScreen

- [ ] Öğrenci bilgileri (ad, telefon, e-posta)
- [ ] Paket durumu kartı (kalan hak, uyarı rengi)
- [ ] Notlar sekmesi (liste + ekle)
- [ ] Geçmiş dersler sekmesi
- [ ] "Mesaj Gönder" butonu
- [ ] "Arşivle" butonu

## Faz 5: Mobil — Profil & Mesajlar

### Task 16: TrainerProfileScreen

- [ ] Profil formu (bio, uzmanlıklar, sertifikalar, şehir, fotoğraf)
- [ ] Bağımsız eğitmen: fiyatlandırma notu alanı
- [ ] Kaydet butonu
- [ ] Çıkış yap butonu

### Task 17: Mesajlar (Reuse)

- [ ] Mevcut MessagesScreen ve ChatScreen'i eğitmen navigasyonunda kullan
- [ ] Okunmamış badge tab'da göster

## Faz 6: Üye Tarafı Entegrasyon

### Task 18: Üye → Eğitmene Bağlanma

- [ ] Keşfet/PT ekranında "Eğitmenime Ekle" butonu
- [ ] `POST /trainer-network/connect` çağrısı
- [ ] Başarı toast + eğitmene bildirim

### Task 19: Deploy & Test

- [ ] Backend build + deploy
- [ ] Mobil test (simulator)
- [ ] Eğitmen hesabıyla giriş testi
- [ ] Tüm akışların end-to-end testi
