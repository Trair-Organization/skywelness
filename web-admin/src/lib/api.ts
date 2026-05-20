import { apiBaseUrl } from './config';
import {
  clearStoredToken,
  readStoredRefreshToken,
  readStoredTenantSubdomain,
  readStoredToken,
  writeStoredRefreshToken,
  writeStoredToken,
} from '../auth/storage';

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
  return 'Request failed';
}

/** Aktif olan tek refresh isteği (paralel 401'leri tek refresh'e indirgemek için). */
let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = readStoredRefreshToken();
  if (!refreshToken) return null;
  const base = apiBaseUrl();
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${base}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearStoredToken();
        return null;
      }
      const body = (await res.json()) as { accessToken?: string; refreshToken?: string };
      if (!body.accessToken) {
        clearStoredToken();
        return null;
      }
      writeStoredToken(body.accessToken);
      if (body.refreshToken) writeStoredRefreshToken(body.refreshToken);
      return body.accessToken;
    } catch {
      clearStoredToken();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function handleSessionExpired(): void {
  clearStoredToken();
  // Login sayfasına dönüş; sonsuz döngüyü önlemek için zaten login'deysek bir şey yapma.
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    // React Router state ile from bilgisi bırakalım
    const current = window.location.pathname + window.location.search;
    window.location.replace(`/login?from=${encodeURIComponent(current)}`);
  }
}

export async function apiJson<T>(
  path: string,
  init: RequestInit & { auth?: boolean; _retried?: boolean } = {},
): Promise<T> {
  const { auth: attachAuth = true, _retried = false, ...restInit } = init;
  const base = apiBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(restInit.headers);
  // FormData ise Content-Type'ı browser otomatik set eder (boundary ile)
  if (!headers.has('Content-Type') && restInit.body && !(restInit.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (attachAuth) {
    const token = readStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const tenantSub = readStoredTenantSubdomain();
    if (tenantSub) {
      headers.set('X-Tenant-Subdomain', tenantSub);
    }
  }
  const res = await fetch(url, { ...restInit, headers });
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
    if (res.status === 401 && attachAuth && !_retried) {
      // Access token expire olmuş olabilir — refresh deneyelim
      const newToken = await tryRefreshAccessToken();
      if (newToken) {
        return apiJson<T>(path, { ...init, _retried: true });
      }
      handleSessionExpired();
      throw new ApiError('Oturum süresi doldu, lütfen tekrar giriş yapın', 401, body);
    }
    if (res.status === 401 && attachAuth && _retried) {
      handleSessionExpired();
    }
    throw new ApiError(parseMessage(body), res.status, body);
  }
  return body as T;
}
