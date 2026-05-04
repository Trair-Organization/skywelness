# Rezidans Fitness (monorepo)

Backend (NestJS + Postgres), web yönetim (Vite + React), React Native mobil.

## Gereksinimler

- Node 20+
- Docker Desktop (Postgres + Redis + MinIO için)
- iOS: Xcode / Android: Android Studio (mobil için)

## İlk kurulum (yerel)

```bash
npm ci
cp backend/.env.example backend/.env
# Gerekirse backend/.env içinde JWT_ACCESS_SECRET vb. düzenleyin (en az 32 karakter).
cp web-admin/.env.example web-admin/.env
```

Veritabanını ayağa kaldır, migration ve seed:

```bash
npm run setup:local
```

`setup:local` şunları yapar: `docker compose up -d` → Postgres hazır olana kadar bekle → migration → `seed-dev.sql` (demo kiracı, e2e kullanıcıları, admin, üye, eğitmen, örnek slot).

## Çalıştırma

**API + web admin (tek terminal):**

```bash
npm run dev
```

(`npm run dev:app` ile aynı.)

- API: `http://localhost:3000/api/v1`
- Web admin: `http://localhost:5173` — giriş: kiracı `demo`, `admin@e2e.demo` / `Admin123!`

**Sadece API:**

```bash
npm run dev:backend
```

**Mobil (Metro ayrı terminal):**

```bash
npm run dev:mobile
# Ardından
npm run ios -w mobile
# veya
npm run android -w mobile
```

Mobil uygulama varsayılan olarak emülatörden API’ye bağlanır (`src/config.ts`). **Fiziksel cihazda** aynı ağdaki makinenizin IP’sini bu dosyada API adresi olarak yazın.

## Demo hesaplar (seed sonrası)

| Ortam     | E-posta          | Şifre       | Rol           |
| --------- | ---------------- | ----------- | ------------- |
| Web admin | admin@e2e.demo   | Admin123!   | administrator |
| Mobil üye | member@e2e.demo  | Member123!  | member        |
| Eğitmen   | trainer@e2e.demo | Trainer123! | trainer       |

## Yararlı komutlar

```bash
npm run lint
npm run build
npm run docker:down
npm run db:seed
```
