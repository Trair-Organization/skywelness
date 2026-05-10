/* eslint-disable react-refresh/only-export-components -- context + hook live together */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiJson } from '../lib/api';
import {
  clearStoredToken,
  readStoredToken,
  writeStoredRefreshToken,
  writeStoredTenantSubdomain,
  writeStoredToken,
} from './storage';
import type { AuthUser, LoginResponse } from './types';

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string, tenantSubdomain: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const refreshMe = useCallback(async () => {
    const t = readStoredToken();
    if (!t) {
      setUser(null);
      setToken(null);
      return;
    }
    setToken(t);
    try {
      const me = await apiJson<AuthUser>('/auth/me', { method: 'GET' });
      setUser(me);
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshMe();
      setReady(true);
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string, tenantSubdomain: string) => {
    const sub = tenantSubdomain.trim().toLowerCase();
    const res = await apiJson<LoginResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password, tenantSubdomain: sub }),
    });
    writeStoredToken(res.accessToken);
    if (res.refreshToken) writeStoredRefreshToken(res.refreshToken);
    writeStoredTenantSubdomain(sub);
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    void (async () => {
      const t = readStoredToken();
      if (t) {
        try {
          await apiJson('/auth/logout', { method: 'POST' });
        } catch {
          // ignore
        }
      }
      clearStoredToken();
      setToken(null);
      setUser(null);
    })();
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, logout, refreshMe }),
    [token, user, ready, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
