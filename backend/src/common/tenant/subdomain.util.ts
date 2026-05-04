import { RESERVED_SUBDOMAINS } from './subdomain.constants';

export function extractTenantSubdomain(hostValue: string | undefined | null): string | null {
  if (!hostValue) {
    return null;
  }
  const host = hostValue.trim().toLowerCase().split(':')[0];
  if (!host) {
    return null;
  }

  const parts = host.split('.');
  if (parts.length < 3) {
    return null;
  }

  const subdomain = parts[0];
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return null;
  }

  return subdomain;
}
