# Wellness Club Platform — Mimari Doküman

## Sistem Haritası

```
┌──────────────────────────────────────────────────────────┐
│              FRONTEND ARAYÜZLER                            │
├──────────────────────────────────────────────────────────┤
│ 1. Mobil App (Üye)     → Keşif, rezervasyon, mesaj       │
│ 2. Mobil App (Eğitmen) → Eğitmen paneli (ajanda, öğrenci)│
│ 3. Public Website      → wellnessclub.tech (herkese açık)│
│ 4. Üye Web Dashboard   → /dashboard                     │
│ 5. Partner Admin Panel  → /club/dashboard                │
│ 6. Eğitmen Web Panel   → /trainer/dashboard              │
│ 7. Super Admin Panel   → /super-admin/dashboard          │
└──────────────────────────────────────────────────────────┘
                         ↓ ↑
┌──────────────────────────────────────────────────────────┐
│              BACKEND (Tek NestJS API)                     │
│              wellnessclub.tech/api/v1                     │
│              JWT + Role-based access control              │
└──────────────────────────────────────────────────────────┘
                         ↓ ↑
┌──────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL)                        │
│              Multi-tenant, tek veritabanı                 │
└──────────────────────────────────────────────────────────┘
```

## Roller ve Erişim

| Rol | Mobil | Web | Erişim |
|-----|-------|-----|--------|
| Üye (member) | ✅ Üye app | ✅ /dashboard | Keşif, rezervasyon, paketler, mesajlar |
| Eğitmen (trainer) | ✅ Eğitmen paneli | ✅ /trainer/dashboard | Ajanda, öğrenciler, profil, mesajlar |
| Bireysel Eğitmen | ✅ Eğitmen paneli | ✅ /trainer/dashboard | Aynı + bağlantı kodu |
| Kulüp Admin (administrator) | ❌ | ✅ /club/dashboard | Üyeler, eğitmenler, randevular, slotlar, paketler |
| Platform Admin (platform_admin) | ❌ | ✅ /super-admin/dashboard | Tüm kulüpler, başvurular, audit |

## Mobil Uygulama — Rol Bazlı Navigasyon

```
Giriş → Rol algıla:
  member              → MemberTabNavigator (Keşfet, Kulüp, Spa, PT, Profil)
  trainer             → TrainerTabNavigator (Panel, Ajanda, Öğrenciler, Mesajlar, Profil)
  independent_trainer → TrainerTabNavigator (aynı)
```

## Web — Giriş Sonrası Yönlendirme

```
/login → Email + Şifre → Rol algıla:
  member          → /dashboard
  trainer         → /trainer/dashboard
  administrator   → /club/dashboard
  platform_admin  → /super-admin/dashboard
```

## Unified Booking System (v2)

### Tablolar
- `service_catalog` — Hizmet kataloğu (PT, masaj, kort, grup ders...)
- `schedule_slot` — Müsaitlik slotları (tüm tipler tek tablo)
- `appointment` — Rezervasyonlar (tüm tipler tek tablo)

### API Endpoint'leri
- `GET /v2/services?tenant=X` — Hizmetler
- `GET /v2/schedule?tenant=X&serviceId=Y&date=Z` — Slotlar
- `GET /v2/schedule/provider?tenant=X&providerId=Y&date=Z` — Eğitmen slotları
- `POST /v2/appointments` — Randevu oluştur
- `GET /v2/appointments/my` — Üye randevuları
- `GET /v2/appointments` — Admin: tüm randevular
- `PATCH /v2/appointments/:id` — Admin: durum güncelle
- `POST /v2/schedule/generate` — Admin: toplu slot oluştur

### Eski Sistem (Deprecated — Sunset: 31 Aralık 2026)
- `GET /trainers` → Yerine: `GET /v2/services`
- `GET /availability` → Yerine: `GET /v2/schedule`
- `POST /reservations` → Yerine: `POST /v2/appointments`

## Deploy Süreci

### Backend
```bash
ssh sunucu
cd /opt/skywelness/app
git fetch origin && git reset --hard origin/main
cp -a /tmp/wellness-backend.env.bak backend/.env
npm run migration:run -w backend  # yeni migration varsa
npm run build -w backend
systemctl restart wellness-api.service
```

### Web Frontend
```bash
# Lokal build (sunucuda Vite native binding sorunu var)
npm run build -w web-admin
# Sunucuya kopyala
scp -r web-admin/dist/* root@sunucu:/var/www/wellnessclub.tech/
ssh sunucu "systemctl reload nginx"
```

### Mobil
```bash
# Expo ile geliştirme
npx expo start
# Production build
eas build --platform ios/android
```

## Dosya Yapısı

```
skywelness/
├── backend/src/
│   ├── unified-booking/    → v2 Unified Booking System
│   ├── booking/            → Eski sistem (deprecated)
│   ├── resource-booking/   → O'Padel kort sistemi
│   ├── auth/               → Kimlik doğrulama
│   ├── admin/              → Kulüp admin endpoint'leri
│   ├── platform-admin/     → Süper admin endpoint'leri
│   ├── trainer-panel/      → Eğitmen panel endpoint'leri
│   ├── discovery/          → Public keşif + banner
│   ├── events/             → Etkinlik yönetimi
│   ├── messaging/          → Mesajlaşma
│   └── database/           → Entity'ler + migration'lar
├── web-admin/src/pages/
│   ├── Public*.tsx          → Herkese açık sayfalar
│   ├── MemberDashboard.tsx  → Üye paneli
│   ├── Club*.tsx            → Kulüp admin sayfaları
│   ├── Trainer*.tsx         → Eğitmen panel sayfaları
│   ├── SuperAdmin*.tsx      → Platform admin sayfaları
│   └── Appointments*.tsx    → v2 randevu yönetimi
├── mobile-expo/src/
│   ├── screens/member/      → Üye ekranları
│   ├── screens/trainer/     → Eğitmen ekranları
│   └── navigation/          → Rol bazlı navigasyon
└── docs/
    ├── architecture.md      → Bu dosya
    └── v2-migration-plan.md → Mobil v2 geçiş planı
```
