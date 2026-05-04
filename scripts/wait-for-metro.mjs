/**
 * Waits until Metro is listening on the dev port (default 8082, see mobile/metro.config.js).
 * Uses TCP connect — Metro 0.84+ may not serve GET /status.
 */
import net from 'node:net';

const port = Number(process.env.METRO_PORT ?? 8082);
const maxAttempts = Number(process.env.METRO_WAIT_ATTEMPTS ?? 90);
const intervalMs = Number(process.env.METRO_WAIT_INTERVAL_MS ?? 1000);

function portOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(2000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

for (let i = 0; i < maxAttempts; i++) {
  if (await portOpen()) {
    process.stdout.write(`Metro is listening on port ${port}.\n`);
    process.exit(0);
  }
  process.stdout.write(`Waiting for Metro on ${port}… (${i + 1}/${maxAttempts})\n`);
  await new Promise((r) => setTimeout(r, intervalMs));
}

process.stderr.write(`Nothing is listening on port ${port}. Run: npm run start -w mobile\n`);
process.exit(1);
