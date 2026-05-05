import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { setAdminLanguage } from '../i18n';
import { useAuth } from '../auth/AuthContext';

type PendingTrainerApplicationRow = {
  id: string;
  createdAt: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    tenantSubdomain: string;
    offersSessionTypes: string[];
    specialties: unknown[] | null;
  };
};

export function PendingTrainerApplicationsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingTrainerApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiJson<PendingTrainerApplicationRow[]>(
        '/platform-admin/trainer-applications/pending',
        { method: 'GET' },
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('pendingTrainerApplications.loadError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    setActingId(id);
    setError(null);
    try {
      await apiJson(`/platform-admin/trainer-applications/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ note: null }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('pendingTrainerApplications.actionError'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{t('pendingTrainerApplications.title')}</h1>
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
          <Link className="secondary" to="/">
            {t('pendingTrainerApplications.back')}
          </Link>
        </div>
      </header>

      <section className="card">
        <p className="muted">{t('pendingTrainerApplications.intro')}</p>
        <button type="button" className="secondary" onClick={() => void load()} disabled={loading}>
          {loading
            ? t('pendingTrainerApplications.loading')
            : t('pendingTrainerApplications.refresh')}
        </button>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p className="muted">{t('pendingTrainerApplications.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="muted">{t('pendingTrainerApplications.empty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('pendingTrainerApplications.colName')}</th>
                <th>{t('pendingTrainerApplications.colEmail')}</th>
                <th>{t('pendingTrainerApplications.colPhone')}</th>
                <th>{t('pendingTrainerApplications.colWorkspace')}</th>
                <th>{t('pendingTrainerApplications.colCreatedAt')}</th>
                <th>{t('pendingTrainerApplications.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.trainer.firstName} {r.trainer.lastName}
                  </td>
                  <td>{r.trainer.email}</td>
                  <td>{r.trainer.phone || '-'}</td>
                  <td>{r.trainer.tenantSubdomain}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void review(r.id, 'approve')}
                      disabled={actingId !== null}
                    >
                      {actingId === r.id ? '…' : t('pendingTrainerApplications.approve')}
                    </button>{' '}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void review(r.id, 'reject')}
                      disabled={actingId !== null}
                    >
                      {actingId === r.id ? '…' : t('pendingTrainerApplications.reject')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
