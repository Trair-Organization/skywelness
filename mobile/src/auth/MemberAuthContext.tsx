import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiJson, ApiError } from '../api/client';
import { clearMemberSession, loadMemberSession, saveMemberSession } from './sessionStorage';
import type { AuthRes, MeUser, TenantInfo, TenantListRow } from './memberAuthTypes';

type MemberAuthContextValue = {
  authReady: boolean;
  subdomain: string;
  setSubdomain: (v: string) => void;
  tenant: TenantInfo | null;
  tenantDirectory: TenantListRow[];
  loadingTenant: boolean;
  loadingTenantDir: boolean;
  loadingAuth: boolean;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  token: string | null;
  user: MeUser | null;
  resolveTenantByCode: (explicitSubdomain?: string) => Promise<boolean>;
  loadTenantDirectory: () => Promise<void>;
  clearClubSelection: () => void;
  login: () => Promise<void>;
  registerWithFullName: (
    fullName: string,
    usernameVal: string,
    emailVal: string,
    phoneVal: string,
    passwordVal: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const MemberAuthContext = createContext<MemberAuthContextValue | null>(null);
const SKYLAND_FALLBACK: TenantListRow = {
  id: 'skyland-fallback',
  name: 'Skyland Wellness',
  subdomain: 'skyland-wellness',
};
function normalizeSubdomain(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeUsername(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function hasLegacyRegisterValidation(body: unknown): boolean {
  if (!body || typeof body !== 'object' || !('message' in body)) {
    return false;
  }
  const message = (body as { message?: unknown }).message;
  if (!Array.isArray(message)) {
    return false;
  }
  const joined = message.join(' ').toLowerCase();
  return (
    joined.includes('property username should not exist') ||
    joined.includes('property phone should not exist')
  );
}

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [subdomain, setSubdomain] = useState('');
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [tenantDirectory, setTenantDirectory] = useState<TenantListRow[]>([]);
  const [loadingTenantDir, setLoadingTenantDir] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadMemberSession();
        if (!stored?.refreshToken || !stored.tenantSubdomain) {
          return;
        }
        setSubdomain(stored.tenantSubdomain);
        try {
          const res = await apiJson<AuthRes>('/auth/refresh', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ refreshToken: stored.refreshToken }),
          });
          const ten = await apiJson<TenantInfo>(
            `/tenants/by-subdomain/${encodeURIComponent(stored.tenantSubdomain)}`,
            { auth: false },
          );
          if (cancelled) {
            return;
          }
          setTenant(ten);
          setToken(res.accessToken);
          setUser(res.user);
          await saveMemberSession({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            tenantSubdomain: ten.subdomain,
            tenant: ten,
            user: res.user,
          });
        } catch {
          await clearMemberSession();
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveTenantByCode = useCallback(
    async (explicitSubdomain?: string) => {
      const raw = explicitSubdomain !== undefined ? explicitSubdomain : subdomain;
      const s = raw.trim().toLowerCase();
      if (!s) {
        Alert.alert(t('tenant.section'), t('tenant.enterSubdomain'));
        return false;
      }
      if (explicitSubdomain !== undefined) {
        setSubdomain(s);
      }
      setLoadingTenant(true);
      setTenant(null);
      try {
        const row = await apiJson<TenantInfo>(`/tenants/by-subdomain/${encodeURIComponent(s)}`, {
          auth: false,
        });
        setTenant(row);
        return true;
      } catch (e) {
        const isNetworkFailure =
          e instanceof TypeError && e.message.toLowerCase().includes('network request failed');
        Alert.alert(
          t('tenant.section'),
          e instanceof ApiError
            ? e.message
            : isNetworkFailure
              ? t('tenant.networkFailed')
              : t('tenant.loadFailed'),
        );
        return false;
      } finally {
        setLoadingTenant(false);
      }
    },
    [subdomain, t],
  );

  const loadTenantDirectory = useCallback(async () => {
    setLoadingTenantDir(true);
    try {
      const rows = await apiJson<TenantListRow[]>('/tenants', { auth: false });
      const hasSkyland = rows.some(
        (r) => normalizeSubdomain(r.subdomain) === SKYLAND_FALLBACK.subdomain,
      );
      setTenantDirectory(hasSkyland ? rows : [SKYLAND_FALLBACK, ...rows]);
    } catch {
      // Backend geçici olarak erişilemezse (örn. local API kapalı), kullanıcıyı
      // bloklamamak için fallback kulüp listesiyle devam ediyoruz.
      setTenantDirectory([SKYLAND_FALLBACK]);
    } finally {
      setLoadingTenantDir(false);
    }
  }, []);

  const clearClubSelection = useCallback(() => {
    setTenant(null);
  }, []);

  const completeSignIn = useCallback(async (res: AuthRes, ten: TenantInfo) => {
    setToken(res.accessToken);
    setUser(res.user);
    setPassword('');
    await saveMemberSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      tenantSubdomain: ten.subdomain,
      tenant: ten,
      user: res.user,
    });
  }, []);

  const login = useCallback(async () => {
    if (!tenant) {
      Alert.alert(t('login.section'), t('login.needTenant'));
      return;
    }
    setLoadingAuth(true);
    try {
      const res = await apiJson<AuthRes>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: email.trim(),
          password,
          tenantSubdomain: tenant.subdomain,
        }),
      });
      await completeSignIn(res, tenant);
    } catch (e) {
      Alert.alert(t('login.section'), e instanceof ApiError ? e.message : t('login.failed'));
    } finally {
      setLoadingAuth(false);
    }
  }, [tenant, email, password, t, completeSignIn]);

  const splitFullName = (full: string) => {
    const tname = full.trim();
    const i = tname.indexOf(' ');
    if (i === -1) {
      return { first: tname, last: tname };
    }
    const first = tname.slice(0, i).trim();
    const last = tname.slice(i + 1).trim() || first;
    return { first, last };
  };

  const registerWithFullName = useCallback(
    async (
      fullName: string,
      usernameVal: string,
      emailVal: string,
      phoneVal: string,
      passwordVal: string,
    ) => {
      if (!tenant) {
        Alert.alert(t('register.section'), t('login.needTenant'));
        return;
      }
      const { first, last } = splitFullName(fullName);
      if (!first) {
        Alert.alert(t('register.section'), t('register.fullNameRequired'));
        return;
      }
      const username = normalizeUsername(usernameVal);
      if (!username) {
        Alert.alert(t('register.section'), t('register.usernameRequired'));
        return;
      }
      setEmail(emailVal);
      setPassword(passwordVal);
      setLoadingAuth(true);
      try {
        const registerPayload = {
          email: emailVal.trim(),
          username,
          phone: phoneVal.trim() || undefined,
          password: passwordVal,
          firstName: first,
          lastName: last,
          tenantSubdomain: tenant.subdomain,
        };
        let res: AuthRes | { pendingApproval: true; message?: string };
        try {
          res = await apiJson<AuthRes | { pendingApproval: true; message?: string }>(
            '/auth/register',
            {
              method: 'POST',
              auth: false,
              body: JSON.stringify(registerPayload),
            },
          );
        } catch (e) {
          // Eski backend şemasında username/phone alanları reject edildiğinde
          // kullanıcıyı bloklamamak için legacy payload ile tekrar deniyoruz.
          if (e instanceof ApiError && hasLegacyRegisterValidation(e.body)) {
            res = await apiJson<AuthRes | { pendingApproval: true; message?: string }>(
              '/auth/register',
              {
                method: 'POST',
                auth: false,
                body: JSON.stringify({
                  email: emailVal.trim(),
                  password: passwordVal,
                  firstName: first,
                  lastName: last,
                  tenantSubdomain: tenant.subdomain,
                }),
              },
            );
            Alert.alert(t('register.section'), t('register.legacyServerNotice'));
          } else {
            throw e;
          }
        }
        if ('pendingApproval' in res && res.pendingApproval) {
          Alert.alert(t('register.pendingTitle'), res.message ?? t('register.pendingBody'));
          return;
        }
        await completeSignIn(res as AuthRes, tenant);
      } catch (e) {
        Alert.alert(
          t('register.section'),
          e instanceof ApiError ? e.message : t('register.failed'),
        );
      } finally {
        setLoadingAuth(false);
      }
    },
    [tenant, t, completeSignIn],
  );

  const logout = useCallback(async () => {
    if (token && tenant) {
      try {
        await apiJson('/auth/logout', {
          method: 'POST',
          token,
          tenantSubdomain: tenant.subdomain,
        });
      } catch {
        // ignore
      }
    }
    await clearMemberSession();
    setToken(null);
    setUser(null);
    setPassword('');
  }, [token, tenant]);

  const value = useMemo<MemberAuthContextValue>(
    () => ({
      authReady,
      subdomain,
      setSubdomain,
      tenant,
      tenantDirectory,
      loadingTenant,
      loadingTenantDir,
      loadingAuth,
      email,
      setEmail,
      password,
      setPassword,
      token,
      user,
      resolveTenantByCode,
      loadTenantDirectory,
      clearClubSelection,
      login,
      registerWithFullName,
      logout,
    }),
    [
      authReady,
      subdomain,
      tenant,
      tenantDirectory,
      loadingTenant,
      loadingTenantDir,
      loadingAuth,
      email,
      password,
      token,
      user,
      resolveTenantByCode,
      loadTenantDirectory,
      clearClubSelection,
      login,
      registerWithFullName,
      logout,
    ],
  );

  return <MemberAuthContext.Provider value={value}>{children}</MemberAuthContext.Provider>;
}

export function useMemberAuth() {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) {
    throw new Error('useMemberAuth must be used within MemberAuthProvider');
  }
  return ctx;
}
