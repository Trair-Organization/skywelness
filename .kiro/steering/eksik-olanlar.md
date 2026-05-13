---
inclusion: manual
---

# Projede Eksik Olanlar

Son güncelleme: 13 Mayıs 2026

Bu belge, sistemin mevcut durumunda eksik olan özellikleri öncelik sırasıyla listeler.
Projeyi açtığında "eksik olanlar belgesini incele ve listeye önüme getir" dediğinde bu liste sunulur.

---

## 🔴 Yüksek Öncelik

| # | Özellik | Açıklama | Etkilenen Alan |
|---|---------|----------|----------------|
| 1 | **Çalışma Saatleri** | Tenant seviyesinde "Pzt-Cum 07:00-22:00, Cmt 09:00-18:00" — admin panelden girilmeli, mobil profil sayfasında gösterilmeli | Backend + Admin + Mobil |
| 2 | **Stripe Tam Entegrasyon** | Altyapı hazır (checkout session + webhook) ama production key'leri eklenmedi. Stripe Dashboard'da webhook URL tanımlanmalı | Backend config |
| 3 | **Bulk Slot Oluşturma (Resource)** | Resource slotları için "önümüzdeki 30 gün boyunca her gün 06:00-24:00 arası slot oluştur" — şu an admin tek tek gün seçiyor | Backend + Admin |

---

## 🟡 Orta Öncelik

| # | Özellik | Açıklama | Etkilenen Alan |
|---|---------|----------|----------------|
| 4 | **Sosyal Medya Linkleri** | Tenant entity'ye Instagram, Facebook, YouTube, Twitter alanları ekle. Admin panelden girilsin, profil sayfasında gösterilsin | Backend + Admin + Mobil |
| 5 | **Recurring Schedule Şablonları** | "Her Pazartesi 09-18" kalıcı şablon — mevcut bulk sadece finite date range üretiyor, şablon kaydedilmiyor | Backend + Admin |
| 6 | **Kapalı Günler / Tatil Yönetimi** | Resmi tatiller, özel kapalı günler — admin panelden girilsin, slot oluşturma ve profilde dikkate alınsın | Backend + Admin + Mobil |
| 7 | **Video Desteği** | Galeri'de video URL desteği (YouTube/Vimeo embed veya direkt video). Profil slider'da video oynatma | Backend + Mobil |
| 8 | **Finansal Raporlama** | Aylık gelir, paket satışları, rezervasyon gelirleri — admin dashboard'da grafik/tablo | Backend + Admin |
| 9 | **Değerlendirme / Yorum Sistemi** | Kullanıcılar eğitmen ve kulüplere yıldız + yorum bırakabilsin. Admin moderasyon yapabilsin | Backend + Admin + Mobil |
| 10 | **Keşif'te Arama & Filtreleme** | Konum bazlı, vertical bazlı, fiyat aralığı, rating filtresi. Şu an sadece text arama var | Backend + Mobil |
| 11 | **Otomatik Hatırlatma Konfigürasyonu** | Cron job mevcut ama admin hangi hatırlatmaların gideceğini seçemiyor (T-24h, T-2h toggle) | Backend + Admin |
| 12 | **Eğitmen Müsaitlik Profilde Gösterme** | Şu an sadece resource slotları gösteriliyor, PT eğitmeninin kendi availability'si profil sayfasında görünmüyor | Backend + Mobil |

---

## 🟠 Düşük Öncelik (İleride)

| # | Özellik | Açıklama | Etkilenen Alan |
|---|---------|----------|----------------|
| 13 | **Dinamik Section Sıralama** | Admin profil sayfasındaki bölümlerin sırasını ve görünürlüğünü değiştirebilsin (drag & drop) | Backend + Admin + Mobil |
| 14 | **Tema / Renk Özelleştirme** | Kulüp kendi marka renklerini, font'unu seçebilsin. Profil sayfası buna göre render etsin | Backend + Admin + Mobil |
| 15 | **İndirim Kodu Yönetimi** | Entity (`discount_code`) mevcut ama admin CRUD UI'ı yok | Admin |
| 16 | **Bekleme Listesi Yönetimi** | Entity (`waiting_list`) mevcut ama admin görüntüleme/yönetim UI'ı yok | Admin |
| 17 | **Stok / Envanter Yönetimi** | Fiziksel ürün satışı için envanter takibi (ekipman, supplement vs.) | Backend + Admin |
| 18 | **Çoklu Staff Rolleri** | Şu an tek "administrator" rolü var. Resepsiyonist, muhasebeci gibi alt roller | Backend + Admin |
| 19 | **Paylaşılabilir Profil Linki** | Deep link ile partner/eğitmen profilini paylaşma (web + mobil) | Mobil + Web |
| 20 | **Favori / Kaydet** | Kullanıcı kulüp/eğitmeni favorilere ekleyebilsin | Backend + Mobil |
| 21 | **Harita Entegrasyonu** | Profil sayfasında konum haritası (Google Maps / Apple Maps) | Mobil |
| 22 | **Multi-Currency** | Farklı para birimleri desteği (EUR, USD) — şu an sadece TRY | Backend |
| 23 | **Subscription / Recurring Billing** | Aylık otomatik ödeme (Stripe Subscriptions) | Backend + Mobil |
| 24 | **CDN Entegrasyonu** | Görseller için CloudFront/Cloudflare CDN — şu an lokal `/uploads/` | Infra |
| 25 | **Image Optimization** | Yüklenen görselleri otomatik resize/compress (sharp veya imgproxy) | Backend |

---

## ✅ Tamamlanan Özellikler (Referans)

- Multi-tenant mimari (role-based, vertical-based)
- Partner profil sayfası (section-based, backend-driven)
- Public/Private visibility modeli
- Resource booking (kort, oda, salon — generic)
- Eğitmen yönetimi + profil + hizmet + paket CRUD
- Toplu müsaitlik oluşturma (bulk — tarih aralığı + haftanın günleri)
- Push bildirim sistemi (3 panel: kulüp, PT, platform)
- Mesajlaşma sistemi
- Etkinlik yönetimi + katılım
- Paket/seans yönetimi
- Spa/masöz yönetimi
- Kafe sipariş sistemi
- Galeri/medya (fotoğraf yükleme, slider)
- Keşif ekranı (kulüpler, eğitmenler, etkinlikler, kampanyalar)
- Kampanya yönetimi
- Lead capture sistemi
- Stripe altyapısı (checkout session + webhook — key'ler eklenmedi)
- SMS bildirim (Netgsm + Twilio hybrid)
- Email bildirim (SMTP + Resend)
- Eğitmen detay sayfası (fotoğraf, bio, uzmanlık, sertifika, hizmetler, paketler)
- Admin profil düzenleme (açıklama, konum, hizmetler, logo, galeri)
- SkyCafe tenant (private, Skyland üyeleri otomatik eklendi)
- O'Padel tenant (public, 5 kort, galeri, tam profil)
