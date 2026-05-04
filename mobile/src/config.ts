/**
 * Dev API base (includes /api/v1).
 * - Android emulator: host machine is 10.0.2.2
 * - iOS simulator: localhost
 * Gerçek cihazda: bilgisayarınızın LAN IP’si (örn. http://192.168.1.10:3000/api/v1) — `src/config.ts` içinde düzenleyin.
 */
export function getApiBaseUrls(): string[] {
  // Kullanıcı isteği: simülatör doğrudan canlı backend kullansın.
  // Dev/prod fark etmeksizin tek kaynak prod API.
  return ['http://46.225.178.143:3100/api/v1'];
}

export function getApiBaseUrl(): string {
  return getApiBaseUrls()[0];
}
