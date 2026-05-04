import { apiBaseUrl } from './config';
import { clearStoredToken, readStoredTenantSubdomain, readStoredToken } from '../auth/storage';

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

export async function apiJson<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth: attachAuth = true, ...restInit } = init;
  const base = apiBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(restInit.headers);
  if (!headers.has('Content-Type') && restInit.body) {
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
    if (res.status === 401 && attachAuth) {
      clearStoredToken();
    }
    throw new ApiError(parseMessage(body), res.status, body);
  }
  return body as T;
}
