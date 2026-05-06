import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actorUserId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export function SuperAdminAuditPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<AuditRow[]>('/platform-admin/audit-logs?limit=150', {
        method: 'GET',
      });
      setRows(data);
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
        <h1>{t('superAdmin.audit.title')}</h1>
        <div className="topbarActions">
          <button type="button" className="secondary" onClick={() => void load()}>
            {loading ? t('superAdmin.common.loading') : t('superAdmin.common.refresh')}
          </button>
          <Link className="secondary" to="/super-admin/dashboard">
            {t('superAdmin.common.back')}
          </Link>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <section className="card">
        {loading ? (
          <p className="muted">{t('superAdmin.common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="muted">{t('superAdmin.common.empty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('superAdmin.audit.when')}</th>
                <th>{t('superAdmin.audit.action')}</th>
                <th>{t('superAdmin.audit.target')}</th>
                <th>{t('superAdmin.audit.actor')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.targetType}:{row.targetId}
                  </td>
                  <td>{row.actorUserId ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
