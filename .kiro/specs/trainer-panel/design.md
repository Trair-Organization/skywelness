# Teknik Tasarım — Eğitmen Paneli (Trainer Panel)

## 1. Mimari Genel Bakış

Eğitmen Paneli, mevcut SkyWellness monorepo yapısına entegre edilecektir:

```
mobile-expo/src/
├── navigation/
│   └── TrainerTabNavigator.tsx    ← Eğitmen tab navigasyonu
├── screens/trainer/
│   ├── TrainerDashboardScreen.tsx ← Dashboard
│   ├── TrainerCalendarScreen.tsx  ← Takvim & müsaitlik
│   ├── TrainerStudentsScreen.tsx  ← Öğrenci listesi
│   ├── TrainerStudentDetailScreen.tsx ← Öğrenci detay
│   ├── TrainerMessagesScreen.tsx  ← Mesajlar (reuse)
│   └── TrainerProfileScreen.tsx   ← Profil düzenleme
backend/src/
├── trainer-panel/
│   ├── trainer-panel.module.ts
│   ├── trainer-panel.controller.ts  ← Eğitmen API endpoints
│   └── trainer-panel.service.ts     ← İş mantığı
```

## 2. Veritabanı Değişiklikleri

### Mevcut tablolar (değişiklik yok):

- `trainer` — eğitmen entity
- `trainer_profile` — profil bilgileri
- `trainer_member_link` — eğitmen-öğrenci bağlantısı
- `trainer_member_note` — öğrenci notları
- `availability` — müsaitlik slotları
- `reservation` — ders/randevu kayıtları
- `conversation` / `message` — mesajlaşma

### Yeni alan (reservation tablosuna):

```sql
ALTER TABLE reservation ADD COLUMN reschedule_note TEXT DEFAULT NULL;
ALTER TABLE reservation ADD COLUMN cancelled_by VARCHAR(20) DEFAULT NULL; -- 'trainer' | 'member' | 'admin'
ALTER TABLE reservation ADD COLUMN cancel_reason TEXT DEFAULT NULL;
```

### Yeni alan (trainer_member_link tablosuna):

```sql
ALTER TABLE trainer_member_link ADD COLUMN source VARCHAR(30) DEFAULT 'member_request';
-- 'member_request' | 'trainer_added' | 'admin_assigned'
```

## 3. API Endpoints (Backend)

### TrainerPanelController (`/trainer-panel`)

| Method | Endpoint                     | Açıklama                             |
| ------ | ---------------------------- | ------------------------------------ | ------------- |
| GET    | `/dashboard`                 | Dashboard istatistikleri             |
| GET    | `/calendar?from=&to=`        | Takvim (müsaitlik + dersler)         |
| POST   | `/availability`              | Yeni müsaitlik slotu oluştur         |
| POST   | `/availability/bulk`         | Toplu slot oluştur (haftalık tekrar) |
| PATCH  | `/availability/:id`          | Slot düzenle                         |
| DELETE | `/availability/:id`          | Slot sil                             |
| GET    | `/students`                  | Öğrenci listesi                      |
| GET    | `/students/:userId`          | Öğrenci detay                        |
| POST   | `/students/add-external`     | Dış öğrenci ekle                     |
| DELETE | `/students/:userId`          | Öğrenci arşivle                      |
| POST   | `/lessons`                   | Manuel ders ekle                     |
| POST   | `/lessons/:id/cancel`        | Ders iptal                           |
| POST   | `/lessons/:id/reschedule`    | Ders ertele                          |
| GET    | `/lessons?date=&view=daily   | weekly`                              | Ders programı |
| GET    | `/students/:userId/notes`    | Öğrenci notları                      |
| POST   | `/students/:userId/notes`    | Not ekle                             |
| GET    | `/students/:userId/history`  | Geçmiş dersler                       |
| GET    | `/students/:userId/packages` | Öğrenci paket durumu                 |
| GET    | `/profile`                   | Profil bilgileri                     |
| PATCH  | `/profile`                   | Profil güncelle                      |

### Dashboard Response:

```typescript
{
  todayLessons: number;
  nextLesson: { time: string; studentName: string } | null;
  weeklyLessons: number;
  monthlyCompleted: number;
  monthlyCancelled: number;
  activeStudents: number;
  unreadMessages: number;
  todaySchedule: Array<{ time: string; studentName: string; type: string }>;
}
```

## 4. Mobil Navigasyon

Eğitmen rolüyle giriş yapıldığında `TrainerTabNavigator` aktif olacak:

```typescript
// Tabs:
// 1. 🏠 Panel (Dashboard)
// 2. 📅 Takvim (Calendar + Availability)
// 3. 👥 Öğrenciler (Students)
// 4. 💬 Mesajlar (Messages - reuse existing)
// 5. 👤 Profil (Trainer Profile)
```

## 5. Rol Bazlı Routing

```typescript
// RootNavigator.tsx
if (user.role === 'trainer' || user.role === 'independent_trainer') {
  return <TrainerTabNavigator />;
} else {
  return <MemberTabNavigator />;
}
```

## 6. Takvim Yönetimi Akışı

```
Eğitmen → Takvim Ekranı
  ├── Haftalık/Günlük görünüm toggle
  ├── Boş slot → "Slot Ekle" veya "Ders Ekle"
  ├── Dolu slot → Ders detay (iptal/ertele)
  └── "Toplu Slot Oluştur" → Haftalık tekrar formu
```

## 7. Dış Öğrenci Ekleme Akışı

```
Eğitmen → Öğrenciler → "Dış Öğrenci Ekle"
  ├── Form: Ad, Soyad, Telefon, E-posta
  ├── Backend: E-posta/telefon ile mevcut kullanıcı ara
  │   ├── Bulundu → trainer_member_link oluştur
  │   └── Bulunamadı → Yeni user oluştur (role: member, tenant: eğitmenin tenant'ı)
  │                     + trainer_member_link oluştur
  └── Bildirim: Öğrenciye push notification
```

## 8. Ders İptal/Erteleme Akışı

```
İptal:
  reservation.status = 'cancelled'
  reservation.cancelled_by = 'trainer'
  reservation.cancel_reason = '...'
  → Slot tekrar müsait
  → Öğrenciye bildirim
  → Paket hakkı iade (eğitmen iptal ettiğinde her zaman iade)

Erteleme:
  Eski reservation güncellenir (yeni tarih/saat)
  → Eski slot müsait olur
  → Yeni slot dolu olur
  → Öğrenciye bildirim (eski + yeni tarih)
```

## 9. Güvenlik

- Tüm `/trainer-panel/*` endpoint'leri `JwtAuthGuard` + `RolesGuard` ile korunur
- Sadece `trainer` ve `independent_trainer` rolleri erişebilir
- Eğitmen sadece kendi öğrencilerini/derslerini görebilir
- Dış öğrenci ekleme: sadece eğitmenin kendi tenant'ına

## 10. Bildirim Entegrasyonu

Mevcut `NotificationDispatcher` ve `PushService` kullanılacak:

- Sabah 08:00 cron (mevcut `ReservationReminderService` genişletilecek)
- T-1h hatırlatma (mevcut cron genişletilecek)
- Anlık bildirimler: ders iptal, erteleme, yeni öğrenci
