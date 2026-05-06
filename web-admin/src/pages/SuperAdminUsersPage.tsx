import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

type UserRow = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  accountStatus: string;
  createdAt: string;
};

type TenantOpt = { id: string; name: string; subdomain: string };

export function SuperAdminUsersPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantOpt[]>([]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set('q', q.trim());
    if (role.trim()) sp.set('role', role.trim());
    const s = sp.toString();
    return s ? `?${s}` : '';
  }, [q, role]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<UserRow[]>(`/platform-admin/users${queryString}`, {
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

  async function setStatus(userId: string, status: 'active' | 'pending_approval' | 'rejected') {
    setActingId(userId);
    setError(null);
    try {
      await apiJson(`/platform-admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.users.updateError'));
    } finally {
      setActingId(null);
    }
  }

  async function manageUser(userId: string, payload: { tenantId?: string; role?: string }) {
    setActingId(userId);
    setError(null);
    try {
      await apiJson(`/platform-admin/users/${userId}/manage`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.users.updateError'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{t('superAdmin.users.title')}</h1>
        <Link className="secondary" to="/super-admin/dashboard">
          {t('superAdmin.common.back')}
        </Link>
      </header>
      <section className="card">
        <div className="rowBetween">
          <label>
            {t('superAdmin.common.search')}
            <input value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label>
            {t('superAdmin.users.role')}
            <select className="inputLike" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">{t('superAdmin.users.allRoles')}</option>
              <option value="member">member</option>
              <option value="trainer">trainer</option>
              <option value="independent_trainer">independent_trainer</option>
              <option value="administrator">administrator</option>
              <option value="platform_admin">platform_admin</option>
            </select>
          </label>
        </div>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p className="muted">{t('superAdmin.common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="muted">{t('superAdmin.common.empty')}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('superAdmin.users.name')}</th>
                <th>{t('superAdmin.users.email')}</th>
                <th>{t('superAdmin.users.tenant')}</th>
                <th>{t('superAdmin.users.role')}</th>
                <th>{t('superAdmin.users.status')}</th>
                <th>{t('superAdmin.users.actions')}</th>
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
                  <td>{row.role}</td>
                  <td>{row.accountStatus}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      disabled={actingId === row.id}
                      onClick={() => void setStatus(row.id, 'active')}
                    >
                      {t('superAdmin.users.setActive')}
                    </button>{' '}
                    <button
                      type="button"
                      className="secondary"
                      disabled={actingId === row.id}
                      onClick={() => void setStatus(row.id, 'rejected')}
                    >
                      {t('superAdmin.users.setRejected')}
                    </button>
                    <div style={{ marginTop: 8 }}>
                      <select
                        className="inputLike"
                        defaultValue={row.role}
                        onChange={(e) => void manageUser(row.id, { role: e.target.value })}
                        disabled={actingId === row.id}
                      >
                        <option value="member">member</option>
                        <option value="trainer">trainer</option>
                        <option value="independent_trainer">independent_trainer</option>
                        <option value="administrator">administrator</option>
                        <option value="platform_admin">platform_admin</option>
                      </select>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <select
                        className="inputLike"
                        defaultValue={row.tenantId}
                        onChange={(e) => void manageUser(row.id, { tenantId: e.target.value })}
                        disabled={actingId === row.id}
                      >
                        {tenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.subdomain})
                          </option>
                        ))}
                      </select>
                    </div>
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
