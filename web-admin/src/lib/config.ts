export function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  // Keep admin usable in environments where VITE_API_BASE_URL is not injected.
  const resolved = !url || typeof url !== 'string' ? 'https://www.wellnessclub.tech/api/v1' : url;
  return resolved.replace(/\/$/, '');
}
