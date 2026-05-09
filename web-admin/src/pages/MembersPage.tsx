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

type MemberPackage = {
  id: string;
  status: string;
  remainingSessions: number;
  expiresAt: string;
  assignedTrainerId: string | null;
  assignedTrainerName: string | null;
  packageType: { id: string; name: string; sessionType: string };
};

type PackageType = {
  id: string;
  name: string;
  sessionCount: number;
  price: string;
  validityDays: number;
  sessionType: string;
  active: boolean;
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

  // Üye detay paneli
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberPackages, setMemberPackages] = useState<MemberPackage[]>([]);
  const [memberReservations, setMemberReservations] = useState<
    Array<{
      id: string;
      startTime: string;
      endTime: string;
      status: string;
      sessionType: string;
      trainerName: string | null;
    }>
  >([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [assigningPackage, setAssigningPackage] = useState(false);
  const [selectedPackageTypeId, setSelectedPackageTypeId] = useState('');

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

  async function openMemberDetail(member: Member) {
    setSelectedMember(member);
    setLoadingPackages(true);
    try {
      const [detail, types] = await Promise.all([
        apiJson<{
          packages: MemberPackage[];
          reservations: Array<{
            id: string;
            startTime: string;
            endTime: string;
            status: string;
            sessionType: string;
            trainerName: string | null;
          }>;
        }>(`/admin/members/${member.id}/detail`),
        apiJson<PackageType[]>('/admin/package-types'),
      ]);
      setMemberPackages(detail.packages);
      setMemberReservations(detail.reservations);
      setPackageTypes(types.filter((t) => t.active));
    } catch {
      setMemberPackages([]);
      setMemberReservations([]);
    } finally {
      setLoadingPackages(false);
    }
  }

  async function assignPackage() {
    if (!selectedMember || !selectedPackageTypeId) return;
    setAssigningPackage(true);
    try {
      await apiJson(`/admin/members/${selectedMember.id}/assign-package`, {
        method: 'POST',
        body: JSON.stringify({ packageTypeId: selectedPackageTypeId }),
      });
      // Reload packages
      const pkgs = await apiJson<MemberPackage[]>(`/admin/members/${selectedMember.id}/packages`);
      setMemberPackages(pkgs);
      setSelectedPackageTypeId('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Paket atanamadı');
    } finally {
      setAssigningPackage(false);
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

  function exportCSV() {
    if (members.length === 0) return;
    const header = 'Ad,Soyad,E-posta,Telefon,Durum,Kayıt Tarihi\n';
    const csv = members
      .map(
        (m) =>
          `${m.firstName},${m.lastName},${m.email},${m.phone || ''},${m.accountStatus},${new Date(m.createdAt).toLocaleDateString('tr-TR')}`,
      )
      .join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uyeler_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Üye Yönetimi</h1>
          <p className="dashboard-subtitle">Tüm üyeleri görüntüle, onayla, paket ata</p>
        </div>
        <button className="btn-sm btn-outline" onClick={() => exportCSV()}>
          📥 Excel İndir
        </button>
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

      {/* Üye Detay Paneli */}
      {selectedMember && (
        <div className="card member-detail-panel" style={{ marginBottom: 20 }}>
          <div className="member-detail-header">
            <div className="member-avatar">
              {selectedMember.firstName[0]}
              {selectedMember.lastName[0]}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>
                {selectedMember.firstName} {selectedMember.lastName}
              </h3>
              <p className="muted" style={{ margin: 0 }}>
                {selectedMember.email} {selectedMember.phone && `· ${selectedMember.phone}`}
              </p>
            </div>
            <button
              className="btn-sm btn-outline"
              onClick={() => setSelectedMember(null)}
              style={{ marginLeft: 'auto' }}
            >
              ✕ Kapat
            </button>
          </div>

          <h4 style={{ marginTop: 16 }}>📦 Paketleri</h4>
          {loadingPackages ? (
            <p className="muted">Yükleniyor...</p>
          ) : memberPackages.length === 0 ? (
            <p className="muted">Bu üyenin henüz paketi yok.</p>
          ) : (
            <div className="packages-list">
              {memberPackages.map((pkg) => (
                <div key={pkg.id} className="package-row">
                  <div className="package-info">
                    <strong>{pkg.packageType.name}</strong>
                    <span
                      className={`status-badge status-${pkg.status === 'active' ? 'active' : pkg.status === 'depleted' ? 'rejected' : 'pending_approval'}`}
                    >
                      {pkg.status === 'active'
                        ? 'Aktif'
                        : pkg.status === 'depleted'
                          ? 'Tükendi'
                          : 'Süresi Doldu'}
                    </span>
                  </div>
                  <div className="package-meta">
                    <span>🎯 {pkg.remainingSessions} seans kaldı</span>
                    <span>📅 Son: {pkg.expiresAt}</span>
                    {pkg.assignedTrainerName && <span>🏋️ {pkg.assignedTrainerName}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paket Atama */}
          {packageTypes.length > 0 && (
            <div className="assign-package-form">
              <h4>➕ Yeni Paket Ata</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedPackageTypeId}
                  onChange={(e) => setSelectedPackageTypeId(e.target.value)}
                  className="small-select"
                  style={{ minWidth: 200 }}
                >
                  <option value="">Paket seçin...</option>
                  {packageTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.sessionCount} seans · ₺
                      {Number(pt.price).toLocaleString('tr-TR')})
                    </option>
                  ))}
                </select>
                <button
                  className="btn-sm btn-success"
                  onClick={() => void assignPackage()}
                  disabled={!selectedPackageTypeId || assigningPackage}
                >
                  {assigningPackage ? '...' : 'Ata'}
                </button>
              </div>
            </div>
          )}

          {/* Geçmiş Randevular */}
          {memberReservations.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <h4>📅 Son Randevular</h4>
              <div className="packages-list">
                {memberReservations.slice(0, 10).map((r) => (
                  <div key={r.id} className="package-row">
                    <div className="package-info">
                      <strong>
                        {new Date(r.startTime).toLocaleDateString('tr-TR')}{' '}
                        {new Date(r.startTime).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                      <span
                        className={`status-badge ${r.status === 'completed' ? 'status-active' : r.status === 'confirmed' ? 'badge-blue' : r.status === 'cancelled' ? 'status-rejected' : 'status-pending_approval'}`}
                      >
                        {r.status === 'completed'
                          ? 'Tamamlandı'
                          : r.status === 'confirmed'
                            ? 'Onaylı'
                            : r.status === 'cancelled'
                              ? 'İptal'
                              : 'Bekliyor'}
                      </span>
                    </div>
                    <div className="package-meta">
                      <span>{r.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}</span>
                      {r.trainerName && <span>→ {r.trainerName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                <th>Kayıt</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => void openMemberDetail(m)}
                  style={{ cursor: 'pointer' }}
                >
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
                  <td onClick={(e) => e.stopPropagation()}>
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
                    {m.accountStatus === 'active' && (
                      <button
                        className="btn-sm btn-outline"
                        onClick={() => void openMemberDetail(m)}
                      >
                        📦 Paketler
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
