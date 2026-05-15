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

type MemberDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  accountStatus: string;
  lastLogin: string | null;
  createdAt: string;
  packages: Array<{
    id: string;
    status: string;
    remainingSessions: number;
    expiresAt: string;
    assignedTrainerName: string | null;
    packageType: { name: string; sessionType: string };
  }>;
  reservations: Array<{
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    sessionType: string;
    trainerName: string | null;
  }>;
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
  { value: 'pending_approval', label: 'Bekleyen' },
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

  // Detail panel
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [selectedPkgType, setSelectedPkgType] = useState('');
  const [assigningPkg, setAssigningPkg] = useState(false);

  const load = useCallback(async (status: string, searchTerm: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      if (searchTerm) params.set('search', searchTerm);
      const qs = params.toString() ? `?${params.toString()}` : '';
      setMembers(await apiJson<Member[]>(`/admin/members${qs}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
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
      setError(e instanceof ApiError ? e.message : 'Hata');
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
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActingId(null);
    }
  }

  async function openDetail(member: Member) {
    setLoadingDetail(true);
    try {
      const [d, types] = await Promise.all([
        apiJson<MemberDetail>(`/admin/members/${member.id}/detail`),
        apiJson<PackageType[]>('/admin/package-types'),
      ]);
      setDetail(d);
      setPackageTypes(types.filter((t) => t.active));
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function assignPackage() {
    if (!detail || !selectedPkgType) return;
    setAssigningPkg(true);
    try {
      await apiJson(`/admin/members/${detail.id}/assign-package`, {
        method: 'POST',
        body: JSON.stringify({ packageTypeId: selectedPkgType }),
      });
      // Reload detail
      const d = await apiJson<MemberDetail>(`/admin/members/${detail.id}/detail`);
      setDetail(d);
      setSelectedPkgType('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Paket atanamadı');
    } finally {
      setAssigningPkg(false);
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

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      active: { bg: '#dcfce7', color: '#166534', label: 'Aktif' },
      pending_approval: { bg: '#fef3c7', color: '#92400e', label: 'Bekliyor' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Reddedildi' },
    };
    const c = map[s] || map.active;
    return (
      <span
        style={{
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: '0.72rem',
          fontWeight: 600,
          background: c.bg,
          color: c.color,
        }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Üye Yönetimi
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            {members.length} üye · Tıklayarak detay görüntüle
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#374151',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          📥 Excel İndir
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10 }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: statusFilter === opt.value ? '#fff' : 'transparent',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: statusFilter === opt.value ? '#2563eb' : '#64748b',
                cursor: 'pointer',
                boxShadow: statusFilter === opt.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="İsim veya e-posta ara..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            padding: '8px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: '0.85rem',
            minWidth: 240,
            background: '#fff',
            color: '#0f172a',
          }}
        />
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      {/* Detail Panel (Slide-over) */}
      {detail && (
        <div
          style={{
            marginBottom: 24,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {/* Detail Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
                color: '#2563eb',
                flexShrink: 0,
              }}
            >
              {detail.firstName[0]}
              {detail.lastName[0]}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {detail.firstName} {detail.lastName}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {detail.email} {detail.phone && `· ${detail.phone}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {statusBadge(detail.accountStatus)}
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                Kayıt: {new Date(detail.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </div>
            <button
              onClick={() => setDetail(null)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#64748b',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Detail Body */}
          <div
            style={{
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
            }}
          >
            {/* Sol: Profil Bilgileri */}
            <div>
              <h3
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 12px',
                }}
              >
                Profil Bilgileri
              </h3>
              <div style={{ display: 'grid', gap: 8 }}>
                <InfoRow label="Ad Soyad" value={`${detail.firstName} ${detail.lastName}`} />
                <InfoRow label="E-posta" value={detail.email} />
                <InfoRow label="Telefon" value={detail.phone || '—'} />
                <InfoRow
                  label="Kayıt Tarihi"
                  value={new Date(detail.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
                <InfoRow
                  label="Son Giriş"
                  value={
                    detail.lastLogin
                      ? new Date(detail.lastLogin).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Hiç giriş yapmadı'
                  }
                />
                <InfoRow
                  label="Durum"
                  value={
                    detail.accountStatus === 'active'
                      ? 'Aktif Üye'
                      : detail.accountStatus === 'pending_approval'
                        ? 'Onay Bekliyor'
                        : 'Reddedildi'
                  }
                />
              </div>
            </div>

            {/* Sağ: Paketler */}
            <div>
              <h3
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 12px',
                }}
              >
                📦 Paketler
              </h3>
              {detail.packages.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Aktif paket yok</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.packages.map((pkg) => (
                    <div
                      key={pkg.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                          {pkg.packageType.name}
                        </span>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: pkg.status === 'active' ? '#dcfce7' : '#fee2e2',
                            color: pkg.status === 'active' ? '#166534' : '#991b1b',
                          }}
                        >
                          {pkg.status === 'active'
                            ? 'Aktif'
                            : pkg.status === 'depleted'
                              ? 'Tükendi'
                              : 'Süresi Doldu'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          marginTop: 6,
                          fontSize: '0.8rem',
                          color: '#64748b',
                        }}
                      >
                        <span>🎯 {pkg.remainingSessions} seans</span>
                        <span>📅 {pkg.expiresAt}</span>
                        {pkg.assignedTrainerName && <span>🏋️ {pkg.assignedTrainerName}</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                        {pkg.packageType.sessionType === 'personal_training'
                          ? '🏋️ PT Paketi'
                          : '💆 Masaj Paketi'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Paket Ata */}
              {packageTypes.length > 0 && (
                <div
                  style={{ marginTop: 12, padding: '12px', borderRadius: 8, background: '#f1f5f9' }}
                >
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 6,
                    }}
                  >
                    Yeni Paket Ata
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={selectedPkgType}
                      onChange={(e) => setSelectedPkgType(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                        background: '#fff',
                        color: '#0f172a',
                      }}
                    >
                      <option value="">Paket seçin...</option>
                      {packageTypes.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name} ({pt.sessionCount} seans)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void assignPackage()}
                      disabled={!selectedPkgType || assigningPkg}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        opacity: !selectedPkgType ? 0.5 : 1,
                      }}
                    >
                      {assigningPkg ? '...' : 'Ata'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Randevu Geçmişi */}
          {detail.reservations.length > 0 && (
            <div style={{ padding: '0 24px 20px' }}>
              <h3
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 12px',
                }}
              >
                📅 Randevu Geçmişi
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 8,
                }}
              >
                {detail.reservations.slice(0, 10).map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #f1f5f9',
                      background: '#fafafa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                        {new Date(r.startTime).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        ·{' '}
                        {new Date(r.startTime).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                        {r.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}{' '}
                        {r.trainerName && `· ${r.trainerName}`}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background:
                          r.status === 'completed'
                            ? '#dcfce7'
                            : r.status === 'confirmed'
                              ? '#dbeafe'
                              : r.status === 'cancelled'
                                ? '#fee2e2'
                                : '#fef3c7',
                        color:
                          r.status === 'completed'
                            ? '#166534'
                            : r.status === 'confirmed'
                              ? '#1e40af'
                              : r.status === 'cancelled'
                                ? '#991b1b'
                                : '#92400e',
                      }}
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loadingDetail && <p style={{ color: '#64748b', marginBottom: 16 }}>Detay yükleniyor...</p>}

      {/* Members Table */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Yükleniyor...</p>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👥</div>
          <p>Üye bulunamadı</p>
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Üye</th>
                <th style={thStyle}>E-posta</th>
                <th style={thStyle}>Telefon</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}>Kayıt</th>
                <th style={thStyle}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => void openDetail(m)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                >
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 11,
                          color: '#2563eb',
                          flexShrink: 0,
                        }}
                      >
                        {m.firstName[0]}
                        {m.lastName[0]}
                      </div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>
                        {m.firstName} {m.lastName}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>{m.email}</td>
                  <td style={tdStyle}>{m.phone || '—'}</td>
                  <td style={tdStyle}>{statusBadge(m.accountStatus)}</td>
                  <td style={tdStyle}>{new Date(m.createdAt).toLocaleDateString('tr-TR')}</td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    {m.accountStatus === 'pending_approval' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => void approve(m.id)}
                          disabled={actingId !== null}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#dcfce7',
                            color: '#166534',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => void reject(m.id)}
                          disabled={actingId !== null}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#fee2e2',
                            color: '#991b1b',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✗
                        </button>
                      </div>
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

// ─── Helper Components ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: '1px solid #f8fafc',
      }}
    >
      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{value}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: '#374151',
  verticalAlign: 'middle',
};
