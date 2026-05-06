import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

type Overview = {
  tenants: number;
  users: number;
  trainers: number;
  pendingTrainerApplications: number;
  pendingMembers: number;
};

export function SuperAdminDashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview>({
    tenants: 0,
    users: 0,
    trainers: 0,
    pendingTrainerApplications: 0,
    pendingMembers: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<Overview>('/platform-admin/overview', { method: 'GET' });
      setOverview(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.common.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{t('superAdmin.dashboard.title')}</h1>
        <button type="button" className="secondary" onClick={() => void load()}>
          {loading ? t('superAdmin.common.loading') : t('superAdmin.common.refresh')}
        </button>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <section className="metricsGrid">
        <article className="metricCard">
          <p className="muted">{t('superAdmin.dashboard.tenants')}</p>
          <h2>{overview.tenants}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('superAdmin.dashboard.users')}</p>
          <h2>{overview.users}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('superAdmin.dashboard.trainers')}</p>
          <h2>{overview.trainers}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('superAdmin.dashboard.pendingMembers')}</p>
          <h2>{overview.pendingMembers}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('superAdmin.dashboard.pendingTrainerApplications')}</p>
          <h2>{overview.pendingTrainerApplications}</h2>
        </article>
      </section>

      <section className="card">
        <h2>{t('superAdmin.dashboard.manageTitle')}</h2>
        <div className="panelLinks">
          <Link className="link" to="/super-admin/tenants">
            {t('superAdmin.dashboard.tenantsLink')}
          </Link>
          <Link className="link" to="/super-admin/users">
            {t('superAdmin.dashboard.usersLink')}
          </Link>
          <Link className="link" to="/super-admin/trainers">
            {t('superAdmin.dashboard.trainersLink')}
          </Link>
          <Link className="link" to="/platform/trainers/pending">
            {t('superAdmin.dashboard.applicationsLink')}
          </Link>
          <Link className="link" to="/super-admin/audit">
            {t('superAdmin.dashboard.auditLink')}
          </Link>
        </div>
      </section>
    </div>
  );
}
