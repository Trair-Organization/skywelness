-- Idempotent dev seed (run via: npm run db:seed -w backend from repo root with Docker Postgres up)
INSERT INTO tenant (id, name, subdomain, branding, settings)
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Demo Rezidans',
    'demo',
    '{"primaryColor":"#1976d2"}'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (subdomain) DO NOTHING;

-- Booking fixtures (local Docker seed + CI): e2e trainer/member, package, bookable slot ~7 days ahead
INSERT INTO "user" (id, tenant_id, email, password_hash, first_name, last_name, phone, role, failed_login_attempts)
VALUES
  (
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    'trainer@e2e.demo',
    '$2b$12$d2JP1oss8GqTfBx8iPcnR.fT3.ojU/WMeLG2UBPbAamq54y8SOldi',
    'E2E',
    'Trainer',
    NULL,
    'trainer',
    0
  ),
  (
    '00000000-0000-4000-8000-000000000021',
    '00000000-0000-4000-8000-000000000001',
    'member@e2e.demo',
    '$2b$12$BNWcbkK.AINB3MoJpxtSb.82.84CkFAO19GDu.dzMPYVrnfBMEa.y',
    'E2E',
    'Member',
    NULL,
    'member',
    0
  )
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO "user" (id, tenant_id, email, password_hash, first_name, last_name, phone, role, failed_login_attempts)
VALUES (
  '00000000-0000-4000-8000-0000000000a1',
  '00000000-0000-4000-8000-000000000001',
  'admin@e2e.demo',
  '$2b$12$bveaGLRAIalJTwopjRHex.jRxOyxzl/OnwszfjmU989BpFF6fxaKy',
  'E2E',
  'Admin',
  NULL,
  'administrator',
  0
)
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO trainer (id, user_id, tenant_id, total_sessions)
VALUES (
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  0
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO package_type (id, tenant_id, name, session_count, price, currency, validity_days, session_type, active)
VALUES (
  '00000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000001',
  'E2E PT 10',
  10,
  100.00,
  'TRY',
  365,
  'personal_training',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO package (id, user_id, package_type_id, remaining_sessions, expires_at, status)
VALUES (
  '00000000-0000-4000-8000-000000000032',
  '00000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000031',
  5,
  '2035-12-31',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  remaining_sessions = 5,
  status = 'active',
  expires_at = '2035-12-31',
  updated_at = NOW();

INSERT INTO time_slot (id, trainer_id, availability_id, start_time, end_time, capacity, booked_count)
VALUES (
  '00000000-0000-4000-8000-000000000042',
  '00000000-0000-4000-8000-000000000012',
  NULL,
  (NOW() AT TIME ZONE 'utc') + INTERVAL '7 days',
  (NOW() AT TIME ZONE 'utc') + INTERVAL '7 days' + INTERVAL '60 minutes',
  1,
  0
)
ON CONFLICT (id) DO UPDATE SET
  start_time = (NOW() AT TIME ZONE 'utc') + INTERVAL '7 days',
  end_time = (NOW() AT TIME ZONE 'utc') + INTERVAL '7 days' + INTERVAL '60 minutes',
  booked_count = 0,
  trainer_id = EXCLUDED.trainer_id;

-- Fully booked slot for waiting-list e2e (capacity = booked_count)
INSERT INTO time_slot (id, trainer_id, availability_id, start_time, end_time, capacity, booked_count)
VALUES (
  '00000000-0000-4000-8000-000000000043',
  '00000000-0000-4000-8000-000000000012',
  NULL,
  (NOW() AT TIME ZONE 'utc') + INTERVAL '8 days',
  (NOW() AT TIME ZONE 'utc') + INTERVAL '8 days' + INTERVAL '60 minutes',
  1,
  1
)
ON CONFLICT (id) DO UPDATE SET
  start_time = (NOW() AT TIME ZONE 'utc') + INTERVAL '8 days',
  end_time = (NOW() AT TIME ZONE 'utc') + INTERVAL '8 days' + INTERVAL '60 minutes',
  capacity = 1,
  booked_count = 1,
  trainer_id = EXCLUDED.trainer_id;

-- Partner tenant: Skyland Wellness (mobile: subdomain `skyland-wellness`; demo member password Member123!)
INSERT INTO tenant (id, name, subdomain, branding, settings)
VALUES (
    '00000000-0000-4000-8000-000000000002',
    'Skyland Wellness',
    'skyland-wellness',
    '{"primaryColor":"#0f766e"}'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (subdomain) DO NOTHING;

INSERT INTO "user" (id, tenant_id, email, password_hash, first_name, last_name, phone, role, failed_login_attempts)
VALUES
  (
    '00000000-0000-4000-8000-000000000023',
    '00000000-0000-4000-8000-000000000002',
    'egitmen@skylandwellness.demo',
    '$2b$12$d2JP1oss8GqTfBx8iPcnR.fT3.ojU/WMeLG2UBPbAamq54y8SOldi',
    'Skyland',
    'Eğitmen',
    NULL,
    'trainer',
    0
  ),
  (
    '00000000-0000-4000-8000-000000000022',
    '00000000-0000-4000-8000-000000000002',
    'uye@skylandwellness.demo',
    '$2b$12$BNWcbkK.AINB3MoJpxtSb.82.84CkFAO19GDu.dzMPYVrnfBMEa.y',
    'Skyland',
    'Üye',
    NULL,
    'member',
    0
  )
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO trainer (id, user_id, tenant_id, total_sessions)
VALUES (
  '00000000-0000-4000-8000-000000000015',
  '00000000-0000-4000-8000-000000000023',
  '00000000-0000-4000-8000-000000000002',
  0
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO package_type (id, tenant_id, name, session_count, price, currency, validity_days, session_type, active)
VALUES (
  '00000000-0000-4000-8000-000000000035',
  '00000000-0000-4000-8000-000000000002',
  'Skyland PT 10',
  10,
  100.00,
  'TRY',
  365,
  'personal_training',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO package (id, user_id, package_type_id, remaining_sessions, expires_at, status)
VALUES (
  '00000000-0000-4000-8000-000000000036',
  '00000000-0000-4000-8000-000000000022',
  '00000000-0000-4000-8000-000000000035',
  5,
  '2035-12-31',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  remaining_sessions = 5,
  status = 'active',
  expires_at = '2035-12-31',
  updated_at = NOW();

-- Skyland demo PT slot: 5 Mayıs 06:00–07:00 Europe/Istanbul (= 03:00–04:00 UTC)
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

-- Sample club events (mobile: Yaklaşan etkinlikler). Re-run seed to refresh dates into the future.
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
VALUES
  (
    'f1ced001-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Sabah yoga',
    'Tüm seviyeler için açılış seansı.',
    'Ayşe Demir',
    'Stüdyo 1',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '3 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '3 days' + INTERVAL '75 minutes',
    28,
    true
  ),
  (
    'f1ced002-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'HIIT & core',
    'Yüksek tempolu grup antrenmanı.',
    'Emre Kaya',
    'Fonksiyonel Alan',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '6 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '6 days' + INTERVAL '50 minutes',
    20,
    true
  ),
  (
    'f1ced003-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Beslenme atölyesi',
    'Uzman diyetisyen ile soru–cevap.',
    'Dyt. Melis Arı',
    'Seminer Salonu',
    NULL,
    (NOW() AT TIME ZONE 'utc') + INTERVAL '10 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '10 days' + INTERVAL '60 minutes',
    40,
    true
  ),
  (
    'f1ced004-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Akşam pilates',
    'Mat ile orta seviye.',
    'Ece Yılmaz',
    'Stüdyo 2',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '14 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '14 days' + INTERVAL '60 minutes',
    16,
    true
  ),
  (
    'f1ced011-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Skyland sabah spin',
    'Kontenjan sınırlı — erken gelin.',
    'Can Akın',
    'Cycle Studio',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '4 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '4 days' + INTERVAL '45 minutes',
    18,
    true
  ),
  (
    'f1ced012-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Mindfulness & nefes',
    'Stres yönetimi odaklı kısa workshop.',
    'Selin Güneş',
    'Mind Room',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '8 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '8 days' + INTERVAL '50 minutes',
    25,
    true
  ),
  (
    'f1ced013-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Açık hava stretching',
    'Teras katında; hava durumuna bağlı.',
    'Mert Acar',
    'Teras',
    NULL,
    (NOW() AT TIME ZONE 'utc') + INTERVAL '11 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '11 days' + INTERVAL '40 minutes',
    30,
    true
  ),
  (
    'f1ced014-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'Detoks smoothie günü',
    'Bar’da özel menü ve kısa bilgilendirme.',
    'Buse Şahin',
    'SkyCafe',
    'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=800&q=80',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '16 days',
    (NOW() AT TIME ZONE 'utc') + INTERVAL '16 days' + INTERVAL '120 minutes',
    50,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  coach_name = EXCLUDED.coach_name,
  location = EXCLUDED.location,
  image_url = EXCLUDED.image_url,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  capacity = EXCLUDED.capacity,
  published = EXCLUDED.published,
  updated_at = NOW();
