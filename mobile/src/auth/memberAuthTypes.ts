export type TenantInfo = { id: string; name: string; subdomain: string };
export type TenantListRow = { id: string; name: string; subdomain: string };
export type AuthRes = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: {
    id: string;
    tenantId?: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: string;
  };
};
export type MeUser = AuthRes['user'];
