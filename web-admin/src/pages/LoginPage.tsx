import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { setAdminLanguage } from '../i18n';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { token, user, ready, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (ready && token && user) {
    if (user.role === 'trainer') {
      return <Navigate to="/trainer/dashboard" replace />;
    }
    return <Navigate to={from === '/login' || from === '/' ? '/club/dashboard' : from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email.trim(), password, tenantSubdomain.trim().toLowerCase());
      navigate(from === '/login' || from === '/' ? '/club/dashboard' : from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.error'));
    } finally {
      setPending(false);
    }
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
          {t('login.tenant')}
          <input
            value={tenantSubdomain}
            onChange={(e) => setTenantSubdomain(e.target.value)}
            autoComplete="organization"
            required
          />
        </label>
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? t('login.pending') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}
