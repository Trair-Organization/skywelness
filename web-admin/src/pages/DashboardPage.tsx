import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { setAdminLanguage } from '../i18n';

type AdminPing = { ok: boolean; scope: string };

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pingResult, setPingResult] = useState<string | null>(null);

  async function pingAdmin() {
    setPingResult(null);
    try {
      const res = await apiJson<AdminPing>('/admin/ping', { method: 'GET' });
      setPingResult(JSON.stringify(res));
    } catch (e) {
      setPingResult(e instanceof ApiError ? `${e.status}: ${e.message}` : 'Error');
    }
  }

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{t('dashboard.title')}</h1>
          <p className="muted">
            {user?.firstName} {user?.lastName} · {user?.email} · {user?.role}
          </p>
        </div>
        <div className="topbarActions">
          <div className="langBar inline">
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
          <button type="button" className="secondary" onClick={signOut}>
            {t('dashboard.signOut')}
          </button>
        </div>
      </header>
      <section className="card">
        <h2>{t('dashboard.members')}</h2>
        <p className="muted">{t('dashboard.membersDesc')}</p>
        <Link className="link" to="/members/pending">
          {t('dashboard.pendingMembersLink')}
        </Link>
      </section>
      {user?.role === 'platform_admin' ? (
        <section className="card">
          <h2>{t('dashboard.platformTrainers')}</h2>
          <p className="muted">{t('dashboard.platformTrainersDesc')}</p>
          <Link className="link" to="/platform/trainers/pending">
            {t('dashboard.pendingTrainerApplicationsLink')}
          </Link>
        </section>
      ) : null}
      <section className="card">
        <h2>{t('dashboard.events')}</h2>
        <p className="muted">{t('dashboard.eventsDesc')}</p>
        <Link className="link" to="/events">
          {t('dashboard.eventsLink')}
        </Link>
      </section>
      <section className="card">
        <h2>{t('dashboard.apiCheck')}</h2>
        <p className="muted">{t('dashboard.apiCheckDesc')}</p>
        <button type="button" onClick={() => void pingAdmin()}>
          {t('dashboard.ping')}
        </button>
        {pingResult ? <pre className="pre">{pingResult}</pre> : null}
      </section>
    </div>
  );
}
