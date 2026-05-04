-- Sample upcoming club events for every tenant (production or local).
-- Idempotent: removes only rows tagged with __skywelness_seed_v1__, then re-inserts
-- with fresh future dates. Safe to re-run.
-- Usage (from repo root, Postgres reachable as in docker-compose):
--   docker compose exec -T postgres psql -U rezidans -d rezidans_dev -f - < backend/scripts/seed-club-events-all-tenants.sql

BEGIN;

DELETE FROM club_event
WHERE description LIKE '%__skywelness_seed_v1__%';

INSERT INTO club_event (
  id,
  tenant_id,
  title,
  description,
  coach_name,
  location,
  image_url,
  starts_at,
  ends_at,
  capacity,
  published
)
SELECT
  gen_random_uuid(),
  t.id,
  v.title,
  v.body || E'\n__skywelness_seed_v1__',
  v.coach_name,
  v.location,
  NULLIF(btrim(COALESCE(v.image_url, '')), ''),
  (NOW() AT TIME ZONE 'utc') + ((v.day_offset)::integer * interval '1 day'),
  (NOW() AT TIME ZONE 'utc') + ((v.day_offset)::integer * interval '1 day')
    + ((v.dur_mins)::integer * interval '1 minute'),
  v.cap,
  true
FROM tenant t
CROSS JOIN (
  VALUES
    (
      'Sabah yoga',
      'Tüm seviyeler için açılış seansı.',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
      'Ayşe Demir',
      'Stüdyo 1',
      3,
      75,
      28
    ),
    (
      'HIIT & core',
      'Yüksek tempolu grup antrenmanı.',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
      'Emre Kaya',
      'Fonksiyonel Alan',
      6,
      50,
      20
    ),
    (
      'Beslenme atölyesi',
      'Uzman diyetisyen ile soru–cevap.',
      NULL::text,
      'Dyt. Melis Arı',
      'Seminer Salonu',
      10,
      60,
      40
    ),
    (
      'Akşam pilates',
      'Mat ile orta seviye.',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
      'Ece Yılmaz',
      'Stüdyo 2',
      14,
      60,
      16
    )
) AS v(title, body, image_url, coach_name, location, day_offset, dur_mins, cap);

COMMIT;
