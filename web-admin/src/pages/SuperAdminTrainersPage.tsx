import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

type TrainerRow = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avgRating: string;
  totalSessions: number;
  offersSessionTypes: string[];
  createdAt: string;
};

type TenantOpt = { id: string; name: string; subdomain: string };

export function SuperAdminTrainersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TrainerRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    const s = sp.toString();
    return s ? `?${s}` : '';
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<TrainerRow[]>(`/platform-admin/trainers${queryString}`, {
        method: 'GET',
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.common.loadError'));
    } finally {
      setLoading(false);
    }
  }, [queryString, t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    queueMicrotask(async () => {
      try {
        const data = await apiJson<TenantOpt[]>('/platform-admin/tenants', { method: 'GET' });
        setTenants(data);
      } catch {
        setTenants([]);
      }
    });
  }, []);

  async function assignTenant(trainerId: string, tenantId: string) {
    setActingId(trainerId);
    setError(null);
    try {
      await apiJson(`/platform-admin/trainers/${trainerId}/tenant`, {
        method: 'PATCH',
        body: JSON.stringify({ tenantId }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.trainers.assignError'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{t('superAdmin.trainers.title')}</h1>
        <Link className="secondary" to="/super-admin/dashboard">
          {t('superAdmin.common.back')}
        </Link>
      </header>
      <section className="card">
        <label>
          {t('superAdmin.common.search')}
          <input value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p className="muted">{t('superAdmin.common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="muted">{t('superAdmin.common.empty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('superAdmin.trainers.name')}</th>
                <th>{t('superAdmin.trainers.email')}</th>
                <th>{t('superAdmin.trainers.tenant')}</th>
                <th>{t('superAdmin.trainers.sessions')}</th>
                <th>{t('superAdmin.trainers.rating')}</th>
                <th>{t('superAdmin.trainers.services')}</th>
                <th>{t('superAdmin.trainers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.firstName} {row.lastName}
                  </td>
                  <td>{row.email}</td>
                  <td>{row.tenantName ?? '-'}</td>
                  <td>{row.totalSessions}</td>
                  <td>{row.avgRating}</td>
                  <td>{row.offersSessionTypes.join(', ') || '-'}</td>
                  <td>
                    <select
                      className="inputLike"
                      defaultValue={row.tenantId}
                      disabled={actingId === row.id}
                      onChange={(e) => void assignTenant(row.id, e.target.value)}
                    >
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.subdomain})
                        </option>
                      ))}
                    </select>
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
