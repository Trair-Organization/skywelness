export type TenantInfo = { id: string; name: string; subdomain: string; logoUrl?: string | null };
export type TenantListRow = {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string | null;
};
export type AuthRes = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  tenantSubdomain?: string;
  user: {
    id: string;
    tenantId?: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    photoUrl?: string | null;
    role: string;
    accountStatus?: string;
  };
};
export type MeUser = AuthRes['user'];
