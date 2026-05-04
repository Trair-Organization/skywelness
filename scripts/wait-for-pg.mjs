import { execSync } from 'node:child_process';

const maxAttempts = 40;
const intervalMs = 1000;

function pgReady() {
  try {
    execSync('docker compose exec -T postgres pg_isready -U rezidans -d rezidans_dev', {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

for (let i = 0; i < maxAttempts; i++) {
  if (pgReady()) {
    process.stdout.write('Postgres is ready.\n');
    process.exit(0);
  }
  process.stdout.write(`Waiting for Postgres… (${i + 1}/${maxAttempts})\n`);
  await new Promise((r) => setTimeout(r, intervalMs));
}

process.stderr.write('Postgres did not become ready in time.\n');
process.exit(1);
