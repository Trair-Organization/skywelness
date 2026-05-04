import { RESERVED_SUBDOMAINS } from './subdomain.constants';

function isIpv4(host: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

export function extractTenantSubdomain(hostValue: string | undefined | null): string | null {
  if (!hostValue) {
    return null;
  }
  const firstHost = hostValue.split(',')[0]?.trim().toLowerCase() ?? '';
  const host = firstHost.split(':')[0];
  if (!host) {
    return null;
  }
  if (host === 'localhost' || isIpv4(host)) {
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
