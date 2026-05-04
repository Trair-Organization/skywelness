import { Platform } from 'react-native';

/**
 * Dev API base (includes /api/v1).
 * - Android emulator: host machine is 10.0.2.2
 * - iOS simulator: localhost
 * Gerçek cihazda: bilgisayarınızın LAN IP’si (örn. http://192.168.1.10:3000/api/v1) — `src/config.ts` içinde düzenleyin.
 */
export function getApiBaseUrl(): string {
  if (!__DEV__) {
    return 'https://CHANGE_ME_PRODUCTION/api/v1';
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }
  return 'http://127.0.0.1:3000/api/v1';
}
