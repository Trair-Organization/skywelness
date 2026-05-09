import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

type Member = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  photoUrl: string | null;
  accountStatus: string;
  lastLogin: string | null;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'pending_approval', label: 'Onay Bekleyen' },
  { value: 'rejected', label: 'Reddedildi' },
];

export function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

  const load = useCallback(async (status: string, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      if (searchTerm) params.set('search', searchTerm);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiJson<Member[]>(`/admin/members${qs}`);
      setMembers(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Üyeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load(statusFilter, search);
    });
  }, [load, statusFilter, search]);

  async function approve(id: string) {
    setActingId(id);
    try {
      await apiJson(`/admin/members/${id}/approve`, { method: 'POST' });
      await load(statusFilter, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    setActingId(id);
    try {
      await apiJson(`/admin/members/${id}/reject`, { method: 'POST' });
      await load(statusFilter, search);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
    } finally {
      setActingId(null);
    }
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val);
    setSearchParams((prev) => {
      if (val === 'all') prev.delete('status');
      else prev.set('status', val);
      return prev;
    });
  }

  function handleSearch(val: string) {
    setSearch(val);
    setSearchParams((prev) => {
      if (!val) prev.delete('search');
      else prev.set('search', val);
      return prev;
    });
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Üye Yönetimi</h1>
          <p className="dashboard-subtitle">Tüm üyeleri görüntüle, onayla veya reddet</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="filters-bar">
        <div className="filter-tabs">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-tab ${statusFilter === opt.value ? 'filter-tab-active' : ''}`}
              onClick={() => handleStatusChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="İsim veya e-posta ara..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👥</span>
          <p>Üye bulunamadı</p>
        </div>
      ) : (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Üye</th>
                <th>E-posta</th>
                <th>Telefon</th>
                <th>Durum</th>
                <th>Son Giriş</th>
                <th>Kayıt Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="cell-user">
                      <div className="cell-avatar">
                        {m.firstName[0]}
                        {m.lastName[0]}
                      </div>
                      <span className="cell-name">
                        {m.firstName} {m.lastName}
                      </span>
                    </div>
                  </td>
                  <td>{m.email}</td>
                  <td>{m.phone || '-'}</td>
                  <td>
                    <span className={`status-badge status-${m.accountStatus}`}>
                      {m.accountStatus === 'active'
                        ? 'Aktif'
                        : m.accountStatus === 'pending_approval'
                          ? 'Bekliyor'
                          : 'Reddedildi'}
                    </span>
                  </td>
                  <td>{m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('tr-TR') : '-'}</td>
                  <td>{new Date(m.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td>
                    {m.accountStatus === 'pending_approval' && (
                      <div className="action-btns">
                        <button
                          className="btn-sm btn-success"
                          onClick={() => void approve(m.id)}
                          disabled={actingId !== null}
                        >
                          {actingId === m.id ? '...' : '✓ Onayla'}
                        </button>
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => void reject(m.id)}
                          disabled={actingId !== null}
                        >
                          {actingId === m.id ? '...' : '✗ Reddet'}
                        </button>
                      </div>
                    )}
                    {m.accountStatus === 'rejected' && (
                      <button
                        className="btn-sm btn-success"
                        onClick={() => void approve(m.id)}
                        disabled={actingId !== null}
                      >
                        Tekrar Onayla
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
