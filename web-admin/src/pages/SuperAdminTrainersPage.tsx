import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

type TrainerRow = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  role: 'trainer' | 'independent_trainer' | null;
  isIndependent: boolean;
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
  const [scope, setScope] = useState<'all' | 'club' | 'independent'>('all');
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

  const filteredRows = useMemo(() => {
    if (scope === 'club') return rows.filter((row) => !row.isIndependent);
    if (scope === 'independent') return rows.filter((row) => row.isIndependent);
    return rows;
  }, [rows, scope]);

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
        <label>
          {t('superAdmin.trainers.scopeLabel')}
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'all' | 'club' | 'independent')}
          >
            <option value="all">{t('superAdmin.trainers.scopeAll')}</option>
            <option value="club">{t('superAdmin.trainers.scopeClub')}</option>
            <option value="independent">{t('superAdmin.trainers.scopeIndependent')}</option>
          </select>
        </label>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p className="muted">{t('superAdmin.common.loading')}</p>
        ) : filteredRows.length === 0 ? (
          <p className="muted">{t('superAdmin.common.empty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('superAdmin.trainers.name')}</th>
                <th>{t('superAdmin.trainers.email')}</th>
                <th>{t('superAdmin.trainers.type')}</th>
                <th>{t('superAdmin.trainers.tenant')}</th>
                <th>{t('superAdmin.trainers.sessions')}</th>
                <th>{t('superAdmin.trainers.rating')}</th>
                <th>{t('superAdmin.trainers.services')}</th>
                <th>{t('superAdmin.trainers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.firstName} {row.lastName}
                  </td>
                  <td>{row.email}</td>
                  <td>
                    {row.isIndependent
                      ? t('superAdmin.trainers.typeIndependent')
                      : t('superAdmin.trainers.typeClub')}
                  </td>
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
