# Unified Booking System v2 — Migration Plan

## Durum (Mayıs 2026)

### ✅ Tamamlanan
- Web frontend tamamen v2 API'ye geçirildi
- Admin paneli v2 randevu ve slot yönetimi eklendi
- Üye dashboard v2 randevularını gösteriyor
- Skyland Wellness + O'Padel için service_catalog ve schedule_slot oluşturuldu

### ⏳ Bekleyen: Mobil Uygulama Migrasyonu

Mobil uygulama hâlâ eski sistemi kullanıyor:
- `GET /trainers` → `GET /v2/services?tenant=X&category=personal_training`
- `GET /availability` → `GET /v2/schedule?tenant=X&serviceId=Y&date=Z`
- `POST /reservations` → `POST /v2/appointments`

## Mobil Migrasyon Adımları

### Adım 1: MemberServiceHubScreen (PT & Masaj)
```
Eski: GET /trainers?sessionType=personal_training
Yeni: GET /v2/services?tenant=X&category=personal_training

Eski: GET /availability?trainerId=X&from=...&to=...
Yeni: GET /v2/schedule/provider?tenant=X&providerId=X&date=Y

Eski: POST /reservations { timeSlotId, packageId }
Yeni: POST /v2/appointments { slotId, packageId }
```

### Adım 2: MemberHomeScreen (Masaj Slotları)
```
Eski: GET /trainers?sessionType=massage + GET /availability
Yeni: GET /v2/services?tenant=X&category=massage
      GET /v2/schedule/provider?tenant=X&providerId=X&date=today
```

### Adım 3: MemberReservationsScreen
```
Eski: GET /reservations
Yeni: GET /v2/appointments/my
```

### Adım 4: Eski Tabloları Kaldır (v3)
Tüm mobil geçişi tamamlandıktan sonra:
- `time_slot` tablosunu kaldır
- `availability` tablosunu kaldır  
- `resource_slot` tablosunu kaldır (O'Padel v2'ye geçince)
- `booking` tablosunu kaldır
- `spa_booking` tablosunu kaldır

## Korunan Tablolar (Asla Silinmez)
- `reservation` — Geçmiş rezervasyon kayıtları (23 kayıt)
- `package` — Aktif paketler
- `package_type` — Paket tipleri

## Sunset Tarihi
Eski endpoint'ler: **31 Aralık 2026**
