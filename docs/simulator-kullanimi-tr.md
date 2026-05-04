# Simülatörde uygulamayı görmek (adım adım)

Bu rehber teknik detaya girmeden, **iPhone simülatöründe** Rezidans mobil ekranlarını tekrar açman için yazıldı. Kullandığımız proje klasörü: **`mobile/`** (Expo değil; bilgisayarında Xcode kurulu olmalı).

---

## 0) Bilgisayarında olması gerekenler (bir kere)

| Ne                                 | Neden                                                         |
| ---------------------------------- | ------------------------------------------------------------- |
| **Mac**                            | iOS simülatörü sadece Mac + Xcode ile çalışır.                |
| **Xcode** (App Store)              | Simülatörü açar, uygulamayı derler.                           |
| **Node.js** (LTS, örn. 20 veya 22) | Komutları çalıştırmak için.                                   |
| **Docker Desktop**                 | Veritabanı (PostgreSQL) için; uygulama giriş yapabilsin diye. |

İlk kez iOS derliyorsan, `mobile/ios` içinde bir kez pod kurulumu gerekebilir (aşağıda).

---

## 1) Projeyi aç

**Terminal** uygulamasını aç. Şu klasöre git (kendi bilgisayarındaki yol aynıysa):

```bash
cd /Users/tanju/skywellnes/skywelness
```

Sonra bağımlılıkları yükle (bir kere veya güncelleme sonrası):

```bash
npm install
```

---

## 2) Veritabanı + örnek kullanıcılar (her bilgisayar uyandığında veya ilk kurulumda)

Docker’ın **çalıştığından** emin ol. Proje kökünde:

```bash
npm run setup:local
```

Bu komut: Postgres’i kaldırır, tabloları oluşturur, **demo kiracı + test üyesi** gibi örnek veriyi yükler. Hata alırsan Docker’ı açıp tekrar dene.

---

## 3) Üç terminal penceresi (profesyonel düzen)

Aynı anda **3 ayrı terminal** kullanmak en sade yöntem:

### Terminal A — API (sunucu)

```bash
cd /Users/tanju/skywellnes/skywelness
npm run start:dev -w backend
```

Çalıştığında genelde **3000** portunda dinler. Bu pencereyi kapatma.

### Terminal B — Metro (JavaScript paketleyici)

```bash
cd /Users/tanju/skywellnes/skywelness
npm run start -w mobile
```

“Metro waiting on…” benzeri bir ekran görürsün. Bu pencereyi de açık tut.

### Terminal C — Simülatörde uygulamayı aç

```bash
cd /Users/tanju/skywellnes/skywelness
npm run ios -w mobile
```

İlk seferde Xcode derlemesi uzun sürebilir. Açılan **iPhone simülatöründe** uygulama listesinde “RezidansFitness” (veya proje adı) görünür.

**İlk kez iOS hata verirse** (pod ile ilgili), tek seferlik:

```bash
cd /Users/tanju/skywellnes/skywelness/mobile/ios
bundle install
bundle exec pod install
cd /Users/tanju/skywellnes/skywelness
npm run ios -w mobile
```

---

## 4) Uygulamada ne yaparsın (test senaryosu)

1. **Kiracı:** `demo` yaz → **Kiracıyı yükle**.
2. **Giriş:** e-posta `member@e2e.demo`, şifre seed dokümantasyonundaki gibi (ör. `Member123!`) → **Giriş yap**.
3. Sonrasında antrenör / müsaitlik / rezervasyon butonlarını dene; eksik veya garip gördüğün her şeyi not al.

API adresi simülatörde genelde **`localhost:3000`** üzerinden gider; Android emülatörde farklı olabilir — sen şimdilik **iOS** ile devam et.

---

## 5) Eksikleri “profesyonel” yazmak için basit şablon

Her başlık için kopyala-yapıştır:

1. **Ekran:** Hangi ekranda (ör. “Giriş sonrası ana liste”).
2. **Ne yaptım:** 3–5 kısa adım (ör. “demo yükledim → giriş yaptım → Antrenörleri listele”).
3. **Beklediğim:** Bir cümle.
4. **Olduğu:** Bir cümle (veya ekran görüntüsü).
5. **Cihaz:** iPhone 16 simülatör, iOS sürümü (Ayarlar → Genel’den bakılabilir).

Ekran görüntüsü: Mac’te **Cmd + S** simülatörde, veya **Cmd + Shift + 4** ile bölge seç.

---

## 6) Sık takılan yerler (kısa)

| Belirti                   | Ne yap                                                                          |
| ------------------------- | ------------------------------------------------------------------------------- |
| Giriş olmuyor / ağ hatası | Terminal A’da backend çalışıyor mu? `setup:local` çalıştı mı?                   |
| `pod` hatası              | Yukarıdaki `bundle exec pod install` bir kez.                                   |
| Simülatör açılmıyor       | Xcode’u bir kez açıp lisansı kabul et; Xcode → Open Developer Tool → Simulator. |

---

## Özet

- **Profesyonel tekrar:** her testte **Docker + `setup:local` → 3 terminal (backend, Metro, ios)**.
- **Geri bildirim:** adım + beklenen/olan + ekran görüntüsü.
- Şu an **Expo klasörü (`mobile-expo`) henüz aynı uygulamayı taşımadı**; simülatör için **`mobile`** kullan.

Sorun yaşadığın terminaldeki **kırmızı son 10–15 satırı** kopyalayıp paylaşırsan, teknik bilgi gerektirmeden nerede takıldığını birlikte netleştirebiliriz.
