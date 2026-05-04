-- One-off: Skyland Wellness (trainer 00000000-...015) PT slot for mobile rezervasyon demosu.
-- Yerel saat 5 Mayıs 2026 06:00–07:00 (Europe/Istanbul, yaz saati UTC+3 → 03:00–04:00 UTC).
-- Çalıştır: psql "$DATABASE_URL" -f backend/scripts/skyland-pt-slot-2026-05-05.sql

INSERT INTO time_slot (id, trainer_id, availability_id, start_time, end_time, capacity, booked_count)
VALUES (
  '00000000-0000-4000-8000-000000000052',
  '00000000-0000-4000-8000-000000000015',
  NULL,
  TIMESTAMPTZ '2026-05-05T03:00:00Z',
  TIMESTAMPTZ '2026-05-05T04:00:00Z',
  1,
  0
)
ON CONFLICT (id) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  booked_count = 0,
  trainer_id = EXCLUDED.trainer_id;
