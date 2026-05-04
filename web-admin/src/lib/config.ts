export function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL;
  if (!url || typeof url !== 'string') {
    throw new Error('Missing VITE_API_BASE_URL');
  }
  return url.replace(/\/$/, '');
}
