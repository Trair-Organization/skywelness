#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

docker compose up -d postgres
node scripts/wait-for-pg.mjs

# Use the *published* host port for Postgres so we hit this Compose stack (not another server on :5432).
PG_PORT="$(docker compose port postgres 5432 | awk -F: '{print $NF}')"
export DATABASE_URL="${DATABASE_URL:-postgresql://rezidans:rezidans_dev_pass@127.0.0.1:${PG_PORT}/rezidans_dev}"
npm run migration:run -w backend
npm run db:seed
npm run test:e2e -w backend
