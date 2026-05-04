export interface JwtAccessPayload {
  sub: string;
  tid: string;
  role: string;
}

/** Refresh tokens carry a version to allow global invalidation (logout). */
export interface JwtRefreshPayload {
  sub: string;
  tid: string;
  role: string;
  v: number;
}
