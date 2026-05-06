import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

type TenantRow = {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  trainerCount: number;
};

export function SuperAdminTenantsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(
    async (nextQ: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiJson<TenantRow[]>(
          `/platform-admin/tenants${nextQ.trim() ? `?q=${encodeURIComponent(nextQ.trim())}` : ''}`,
          { method: 'GET' },
        );
        setRows(data);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('superAdmin.common.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load(q);
    });
  }, [load, q]);

  async function createTenant() {
    if (!newName.trim() || !newSubdomain.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await apiJson('/platform-admin/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          subdomain: newSubdomain.trim().toLowerCase(),
        }),
      });
      setNewName('');
      setNewSubdomain('');
      await load(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.tenants.createError'));
    } finally {
      setCreating(false);
    }
  }

  async function setActive(tenantId: string, isActive: boolean) {
    setActingId(tenantId);
    setError(null);
    try {
      await apiJson(`/platform-admin/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      await load(q);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('superAdmin.tenants.updateError'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{t('superAdmin.tenants.title')}</h1>
        <Link className="secondary" to="/super-admin/dashboard">
          {t('superAdmin.common.back')}
        </Link>
      </header>
      <section className="card">
        <div className="rowBetween">
          <label>
            {t('superAdmin.tenants.newName')}
            <input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
          <label>
            {t('superAdmin.tenants.newSubdomain')}
            <input value={newSubdomain} onChange={(e) => setNewSubdomain(e.target.value)} />
          </label>
          <button type="button" disabled={creating} onClick={() => void createTenant()}>
            {creating ? t('superAdmin.common.loading') : t('superAdmin.tenants.create')}
          </button>
        </div>
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
                <th>{t('superAdmin.tenants.name')}</th>
                <th>{t('superAdmin.tenants.subdomain')}</th>
                <th>{t('superAdmin.tenants.users')}</th>
                <th>{t('superAdmin.tenants.trainers')}</th>
                <th>{t('superAdmin.tenants.status')}</th>
                <th>{t('superAdmin.tenants.createdAt')}</th>
                <th>{t('superAdmin.tenants.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.subdomain}</td>
                  <td>{row.userCount}</td>
                  <td>{row.trainerCount}</td>
                  <td>
                    {row.isActive
                      ? t('superAdmin.tenants.active')
                      : t('superAdmin.tenants.inactive')}
                  </td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      disabled={actingId === row.id}
                      onClick={() => void setActive(row.id, !row.isActive)}
                    >
                      {row.isActive
                        ? t('superAdmin.tenants.deactivate')
                        : t('superAdmin.tenants.activate')}
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
