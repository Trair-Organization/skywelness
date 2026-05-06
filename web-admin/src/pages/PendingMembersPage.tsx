import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { setAdminLanguage } from '../i18n';
import { useAuth } from '../auth/AuthContext';

type PendingRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

export function PendingMembersPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiJson<PendingRow[]>('/admin/pending-members', { method: 'GET' });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('pendingMembers.loadError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function approve(id: string) {
    setActingId(id);
    setError(null);
    try {
      await apiJson(`/admin/members/${id}/approve`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('pendingMembers.actionError'));
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    setActingId(id);
    setError(null);
    try {
      await apiJson(`/admin/members/${id}/reject`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('pendingMembers.actionError'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{t('pendingMembers.title')}</h1>
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
          <Link className="secondary" to="/club/dashboard">
            {t('pendingMembers.back')}
          </Link>
        </div>
      </header>

      <section className="card">
        <p className="muted">{t('pendingMembers.intro')}</p>
        <button type="button" className="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? t('pendingMembers.loading') : t('pendingMembers.refresh')}
        </button>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p className="muted">{t('pendingMembers.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="muted">{t('pendingMembers.empty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('pendingMembers.colName')}</th>
                <th>{t('pendingMembers.colEmail')}</th>
                <th>{t('pendingMembers.colRegistered')}</th>
                <th>{t('pendingMembers.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.firstName} {r.lastName}
                  </td>
                  <td>{r.email}</td>
                  <td>{new Date(r.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void approve(r.id)}
                      disabled={actingId !== null}
                    >
                      {actingId === r.id ? '…' : t('pendingMembers.approve')}
                    </button>{' '}
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void reject(r.id)}
                      disabled={actingId !== null}
                    >
                      {actingId === r.id ? '…' : t('pendingMembers.reject')}
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
