export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accountStatus?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: AuthUser;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};
