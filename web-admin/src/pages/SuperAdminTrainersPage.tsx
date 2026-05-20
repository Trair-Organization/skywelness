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
  commissionRate: string;
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

  async function updateCommission(trainerId: string, currentRate: string) {
    const currentPct = (parseFloat(currentRate) * 100).toFixed(1);
    const input = prompt(`Yeni komisyon oranı (%):\n(Şu an %${currentPct})`, currentPct);
    if (input === null) return;
    const pct = parseFloat(input);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert('Geçersiz oran (0-100 arası bir sayı girin)');
      return;
    }
    const rate = pct / 100;
    setActingId(trainerId);
    try {
      await apiJson(`/platform-admin/trainers/${trainerId}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ commissionRate: rate }),
      });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Komisyon güncellenemedi');
    } finally {
      setActingId(null);
    }
  }

  async function bulkUpdateCommission() {
    const input = prompt(
      'Tüm eğitmenlerin komisyon oranını yüzde olarak girin:\n(Örn: 7 = %7)',
      '7',
    );
    if (input === null) return;
    const pct = parseFloat(input);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert('Geçersiz oran');
      return;
    }
    if (!confirm(`Tüm eğitmenlerin komisyon oranı %${pct} olarak güncellenecek. Devam?`)) return;
    try {
      const res = await apiJson<{ updated: number }>(
        '/platform-admin/trainers/commission/bulk',
        {
          method: 'PATCH',
          body: JSON.stringify({ commissionRate: pct / 100 }),
        },
      );
      alert(`✅ ${res.updated} eğitmen güncellendi`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Toplu güncelleme başarısız');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
          </div>
          <button
            type="button"
            onClick={() => void bulkUpdateCommission()}
            style={{
              padding: '0.6rem 1rem',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            💰 Tüm Eğitmenler İçin Komisyon Belirle
          </button>
        </div>
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
                <th>Komisyon</th>
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
                  <td>
                    <button
                      type="button"
                      onClick={() => void updateCommission(row.id, row.commissionRate)}
                      disabled={actingId === row.id}
                      style={{
                        padding: '0.3rem 0.7rem',
                        background: 'rgba(37,99,235,0.1)',
                        color: '#2563eb',
                        border: '1px solid #2563eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                      }}
                      title="Komisyon oranını düzenle"
                    >
                      %{(parseFloat(row.commissionRate) * 100).toFixed(1)}
                    </button>
                  </td>
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
