import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { setAdminLanguage } from '../i18n';

export function ClubDashboardPage() {
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
          <h1>{t('clubDashboard.title')}</h1>
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
        <h2>{t('clubDashboard.members')}</h2>
        <p className="muted">{t('clubDashboard.membersDesc')}</p>
        <Link className="link" to="/members/pending">
          {t('dashboard.pendingMembersLink')}
        </Link>
      </section>

      <section className="card">
        <h2>{t('clubDashboard.events')}</h2>
        <p className="muted">{t('clubDashboard.eventsDesc')}</p>
        <Link className="link" to="/events">
          {t('dashboard.eventsLink')}
        </Link>
      </section>

      <section className="card">
        <h2>{t('clubDashboard.reports')}</h2>
        <p className="muted">{t('clubDashboard.reportsDesc')}</p>
        <Link className="link" to="/club/insights">
          {t('clubDashboard.reportsLink')}
        </Link>
      </section>

      <section className="card">
        <h2>SkyCafe</h2>
        <p className="muted">Uyelerin verdigi cafe siparislerini buradan takip edin.</p>
        <Link className="link" to="/club/cafe-orders">
          Siparisleri Gor
        </Link>
      </section>

      <section className="card">
        <h2>Masaj Talep Onayı</h2>
        <p className="muted">Mobil uygulamadan gelen masaj rezervasyon taleplerini onaylayın.</p>
        <Link className="link" to="/club/reservation-requests">
          Talepleri Yönet
        </Link>
      </section>
    </div>
  );
}
