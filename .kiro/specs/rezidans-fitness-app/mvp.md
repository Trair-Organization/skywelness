# MVP scope — Rezidans Fitness

Goal: **one tenant**, **one member** can verify tenant, log in, **see trainers and slots**, **book and cancel** from the mobile app; **one admin** can log into the web panel and hit a protected API. Everything else is out of scope until MVP is stable.

## In scope (MVP)

- Backend: auth (login/register/refresh/logout), tenant resolution, booking catalog, reservations create/cancel, waiting list join + cancel-side promotion (DB state only).
- Mobile: dev API URL, tenant check, login, **minimal booking UI** on one screen (trainers → availability → **paket seçimi `/my-packages`** → book → list/cancel), **TR/EN i18n** + dil anahtarı.
- Web admin: login + panel, **TR/EN i18n**, oturumda **`X-Tenant-Subdomain`** + sunucu `POST /auth/logout`.
- Web admin: login, protected dashboard, smoke call to admin API.
- Local dev: Docker Postgres + seed, CI pipeline that builds/lints/tests with Postgres.

## Explicitly out of scope (until post-MVP)

- Stripe, FCM/e-mail delivery, OAuth, RLS/partitioning, AWS deploy, property-based tests, full admin CRUD, trainer mobile flows, offline, i18n product rollout.

## Implementation order (MVP only)

1. Keep backend booking + auth stable; extend only when the mobile MVP screen needs an endpoint.
2. Harden the single mobile “member home” flow against real API.
3. Web admin: replace ping-only dashboard with one real read-only metric when an endpoint exists; otherwise keep ping.
