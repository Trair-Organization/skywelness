import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { setAdminLanguage } from '../i18n';

type TenantOption = {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  role: string;
};

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { token, user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Multi-tenant seçim state
  const [tenantOptions, setTenantOptions] = useState<TenantOption[] | null>(null);

  if (ready && token && user) {
    if (user.role === 'trainer') {
      return <Navigate to="/trainer/dashboard" replace />;
    }
    if (user.role === 'platform_admin') {
      return <Navigate to="/super-admin/dashboard" replace />;
    }
    if (user.role === 'member') {
      // Üye girince ana siteye git; panele "Panele Geç" linkinden ulaşılır
      return <Navigate to={from === '/login' ? '/' : from} replace />;
    }
    return <Navigate to={from === '/login' || from === '/' ? '/club/dashboard' : from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      // Tenant subdomain olmadan login dene
      const res = await apiJson<
        | { multiTenant: true; tenants: TenantOption[] }
        | { accessToken: string; refreshToken: string; user: unknown; tenantSubdomain: string }
      >('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if ('multiTenant' in res && res.multiTenant) {
        // Birden fazla kulüp — seçim ekranı göster
        setTenantOptions(res.tenants);
        setPending(false);
        return;
      }

      // Tek kulüp — direkt giriş
      const loginRes = res as { tenantSubdomain: string };
      await login(email.trim(), password, loginRes.tenantSubdomain);
      navigate(from === '/login' || from === '/' ? '/' : from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.error'));
    } finally {
      setPending(false);
    }
  }

  async function selectTenant(subdomain: string) {
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password, subdomain);
      navigate(from === '/login' || from === '/' ? '/' : from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.error'));
    } finally {
      setPending(false);
    }
  }

  // Kulüp seçim ekranı
  if (tenantOptions) {
    return (
      <div className="public-shell">
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1
              style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem' }}
            >
              👋 Hoş geldin!
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
              Hangi kulüple devam etmek istiyorsun?
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tenantOptions.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTenant(t.subdomain)}
                disabled={pending}
                className="tenant-select-card"
              >
                <div className="tenant-select-logo">
                  {t.logoUrl ? (
                    <img
                      src={t.logoUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                      {t.name.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem' }}>
                    {t.name}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '3px' }}>
                    {t.role === 'administrator'
                      ? '👑 Yönetici'
                      : t.role === 'trainer'
                        ? '🏋️ Eğitmen'
                        : '👤 Üye'}
                  </div>
                </div>
                <span style={{ color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700 }}>→</span>
              </button>
            ))}
          </div>
          {error && (
            <p
              style={{
                color: '#f87171',
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </p>
          )}
          <button
            onClick={() => {
              setTenantOptions(null);
              setError(null);
            }}
            style={{
              marginTop: '1.5rem',
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'block',
              margin: '1.5rem auto 0',
            }}
          >
            ← Geri dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell narrow">
      <div className="langBar">
        <span className="muted">{t('lang.label')}</span>
        <div className="langBtns">
          <button
            type="button"
            className={i18n.language === 'tr' ? 'langActive' : 'secondary'}
            onClick={() => setAdminLanguage('tr')}
          >
            {t('lang.tr')}
          </button>
          <button
            type="button"
            className={i18n.language === 'en' ? 'langActive' : 'secondary'}
            onClick={() => setAdminLanguage('en')}
          >
            {t('lang.en')}
          </button>
        </div>
      </div>
      <h1>{t('login.title')}</h1>
      <p className="muted">{t('login.subtitle')}</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          {t('login.email')}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          {t('login.password')}
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? t('login.pending') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}
