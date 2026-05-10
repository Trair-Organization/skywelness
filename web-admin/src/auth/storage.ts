const TOKEN_KEY = 'rezidans_admin_access_token';
const REFRESH_TOKEN_KEY = 'rezidans_admin_refresh_token';
const TENANT_SUBDOMAIN_KEY = 'rezidans_admin_tenant_subdomain';

export function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TENANT_SUBDOMAIN_KEY);
}

export function readStoredTenantSubdomain(): string | null {
  try {
    return localStorage.getItem(TENANT_SUBDOMAIN_KEY);
  } catch {
    return null;
  }
}

export function writeStoredTenantSubdomain(subdomain: string): void {
  localStorage.setItem(TENANT_SUBDOMAIN_KEY, subdomain);
}

export function clearStoredTenantSubdomain(): void {
  localStorage.removeItem(TENANT_SUBDOMAIN_KEY);
}
