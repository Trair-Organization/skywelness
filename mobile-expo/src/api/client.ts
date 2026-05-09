import { getApiBaseUrls } from '../config';
import { loadMemberSession, saveMemberSession, clearMemberSession } from '../auth/sessionStorage';

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

// Token refresh lock — aynı anda birden fazla refresh isteği gönderilmesini önler.
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const session = await loadMemberSession();
      if (!session?.refreshToken) {
        await clearMemberSession();
        return null;
      }

      const bases = getApiBaseUrls();
      const url = `${bases[0]}/auth/refresh`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!res.ok) {
        await clearMemberSession();
        return null;
      }

      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
        user?: unknown;
        tenantSubdomain?: string;
      };
      if (!data.accessToken || !data.refreshToken) {
        await clearMemberSession();
        return null;
      }

      // Session'ı güncelle — mevcut tenant/user bilgisini koru, sadece tokenları yenile
      const tenantInfo = session.tenantJson ? JSON.parse(session.tenantJson) : null;
      const userInfo = session.userJson ? JSON.parse(session.userJson) : data.user;
      if (tenantInfo && userInfo) {
        await saveMemberSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          tenantSubdomain: session.tenantSubdomain,
          tenant: tenantInfo,
          user: userInfo,
        });
      }

      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiJson<T>(
  path: string,
  init: RequestInit & {
    auth?: boolean;
    token?: string | null;
    tenantSubdomain?: string | null;
    /** true ise 401'de token refresh denenmez (sonsuz döngü önleme). */
    _skipRefresh?: boolean;
  } = {},
): Promise<T> {
  const {
    auth: attachAuth = true,
    token = null,
    tenantSubdomain = null,
    _skipRefresh = false,
    ...rest
  } = init;
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
        // 401 ve token varsa → refresh dene
        if (res.status === 401 && attachAuth && token && !_skipRefresh) {
          const newToken = await attemptTokenRefresh();
          if (newToken) {
            // Yeni token ile tekrar dene
            return apiJson<T>(path, { ...init, token: newToken, _skipRefresh: true });
          }
        }
        throw new ApiError(parseMessage(body), res.status, body);
      }
      return body as T;
    } catch (e) {
      lastError = e;
      if (e instanceof ApiError) {
        throw e;
      }
      continue;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}
