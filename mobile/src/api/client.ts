import { getApiBaseUrls } from '../config';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function parseMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.join(', ');
  }
  return 'İstek başarısız';
}

export async function apiJson<T>(
  path: string,
  init: RequestInit & {
    auth?: boolean;
    token?: string | null;
    /** When set, sends `X-Tenant-Subdomain` (must match JWT tenant if authenticated). */
    tenantSubdomain?: string | null;
  } = {},
): Promise<T> {
  const { auth: attachAuth = true, token = null, tenantSubdomain = null, ...rest } = init;
  const bases = path.startsWith('http') ? [''] : getApiBaseUrls();
  let lastError: unknown = null;

  for (const base of bases) {
    const url = path.startsWith('http')
      ? path
      : `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(rest.headers);
    if (!headers.has('Content-Type') && rest.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (tenantSubdomain) {
      headers.set('X-Tenant-Subdomain', tenantSubdomain);
    }
    if (attachAuth && token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    try {
      const res = await fetch(url, { ...rest, headers });
      const text = await res.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text) as unknown;
        } catch {
          body = { message: text };
        }
      }
      if (!res.ok) {
        throw new ApiError(parseMessage(body), res.status, body);
      }
      return body as T;
    } catch (e) {
      lastError = e;
      // HTTP cevabı geldiyse fallback denemeden hatayı yukarı ver.
      if (e instanceof ApiError) {
        throw e;
      }
      // Network seviyesinde hata ise bir sonraki base URL'i dene.
      continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}
