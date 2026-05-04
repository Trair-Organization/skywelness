/** Member / trainer / admin roles */
export type UserRole = 'member' | 'trainer' | 'administrator';

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  requestId: string;
}
