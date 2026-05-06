import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { setAdminLanguage } from '../i18n';

export function TrainerDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{t('trainerDashboard.title')}</h1>
          <p className="muted">
            {user?.firstName} {user?.lastName} · {user?.email}
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
        <h2>{t('trainerDashboard.today')}</h2>
        <p className="muted">{t('trainerDashboard.todayDesc')}</p>
      </section>

      <section className="card">
        <h2>{t('trainerDashboard.members')}</h2>
        <p className="muted">{t('trainerDashboard.membersDesc')}</p>
        <Link className="link" to="/trainer/students">
          {t('trainerDashboard.membersLink')}
        </Link>
      </section>
    </div>
  );
}
