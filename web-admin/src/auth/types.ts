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
  expiresIn: number;
  user: AuthUser;
};
