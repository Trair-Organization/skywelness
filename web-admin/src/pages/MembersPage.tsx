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
  membership: {
    id: string;
    membershipType: string;
    startDate: string;
    endDate: string;
    status: string;
    price: string;
  } | null;
  assignedTrainers: Array<{
    linkId: string;
    trainerId: string;
    trainerName: string;
  }>;
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
  const [selectedPkgTrainer, setSelectedPkgTrainer] = useState('');
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
    const pkg = packageTypes.find((p) => p.id === selectedPkgType);
    if (pkg?.sessionType === 'personal_training' && !selectedPkgTrainer) {
      alert('PT paketi için eğitmen seçimi zorunludur.');
      return;
    }
    setAssigningPkg(true);
    try {
      // PT paketiyse önce eğitmen atamasını yap (zaten varsa skip eder)
      if (pkg?.sessionType === 'personal_training' && selectedPkgTrainer) {
        await apiJson(`/admin/members/${detail.id}/assign-trainer`, {
          method: 'POST',
          body: JSON.stringify({ trainerId: selectedPkgTrainer }),
        }).catch(() => {}); // Zaten atanmışsa hata vermez
      }
      await apiJson(`/admin/members/${detail.id}/assign-package`, {
        method: 'POST',
        body: JSON.stringify({
          packageTypeId: selectedPkgType,
          assignedTrainerId: pkg?.sessionType === 'personal_training' ? selectedPkgTrainer : undefined,
        }),
      });
      const d = await apiJson<MemberDetail>(`/admin/members/${detail.id}/detail`);
      setDetail(d);
      setSelectedPkgType('');
      setSelectedPkgTrainer('');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              const name = prompt('Ad Soyad (örn: Ali Veli):');
              if (!name) return;
              const parts = name.trim().split(' ');
              const firstName = parts[0];
              const lastName = parts.slice(1).join(' ') || 'Üye';
              const email = prompt('E-posta (opsiyonel):') || undefined;
              const phone = prompt('Telefon (opsiyonel):') || undefined;
              void apiJson('/admin/members/quick-create', {
                method: 'POST',
                body: JSON.stringify({ firstName, lastName, email, phone }),
              })
                .then(() => {
                  alert('✅ Üye eklendi');
                  void load(statusFilter, search);
                })
                .catch((e: unknown) => alert(e instanceof Error ? e.message : 'Hata'));
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            + Üye Ekle
          </button>
          <button
            onClick={() => {
              const csv = prompt('CSV yapıştırın (her satır: Ad,Soyad,Email,Telefon):');
              if (!csv) return;
              const rows = csv
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                  const [firstName, lastName, email, phone] = line.split(',').map((s) => s.trim());
                  return { firstName: firstName || '', lastName: lastName || '', email, phone };
                })
                .filter((r) => r.firstName);
              if (rows.length === 0) {
                alert('Geçerli veri bulunamadı');
                return;
              }
              void apiJson<{ created: number; exists: number; errors: number }>(
                '/admin/members/bulk-create',
                {
                  method: 'POST',
                  body: JSON.stringify({ members: rows }),
                },
              )
                .then((res) => {
                  alert(`✅ ${res.created} eklendi, ${res.exists} zaten var, ${res.errors} hata`);
                  void load(statusFilter, search);
                })
                .catch((e: unknown) => alert(e instanceof Error ? e.message : 'Hata'));
            }}
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
            📋 Toplu Ekle
          </button>
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
            📥 Excel
          </button>
        </div>
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
              <ProfileEditor detail={detail} onSaved={() => void openDetail(detail as unknown as Member)} />

              {/* Üyelik Bilgisi */}
              <div style={{ marginTop: 16 }}>
                <h3
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 10px',
                  }}
                >
                  🎫 Üyelik
                </h3>
                {detail.membership ? (
                  <div
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
                        {detail.membership.membershipType === 'monthly'
                          ? 'Aylık'
                          : detail.membership.membershipType === 'yearly'
                            ? 'Yıllık'
                            : detail.membership.membershipType}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          background: detail.membership.status === 'active' ? '#dcfce7' : '#fee2e2',
                          color: detail.membership.status === 'active' ? '#166534' : '#991b1b',
                        }}
                      >
                        {detail.membership.status === 'active' ? 'Aktif' : 'Süresi Dolmuş'}
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
                      <span>
                        📅 {detail.membership.startDate} → {detail.membership.endDate}
                      </span>
                      <span>💰 {parseFloat(detail.membership.price).toLocaleString('tr-TR')}₺</span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                    Üyelik tanımlı değil
                  </p>
                )}
                <MembershipForm
                  userId={detail.id}
                  onSaved={() => void openDetail(detail as unknown as Member)}
                />
              </div>

              {/* PT Ataması */}
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>
                  🏋️ Atanmış Eğitmen
                </h3>
                {detail.assignedTrainers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {detail.assignedTrainers.map((t) => (
                      <div key={t.linkId} style={{ padding: '8px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #dbeafe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>🏋️ {t.trainerName}</span>
                        <button onClick={() => {
                          if (!confirm(`${t.trainerName} ataması kaldırılsın mı?`)) return;
                          void apiJson(`/admin/members/${detail.id}/remove-trainer`, {
                            method: 'POST',
                            body: JSON.stringify({ trainerId: t.trainerId }),
                          }).then(() => void openDetail(detail as unknown as Member))
                            .catch((e: unknown) => alert(e instanceof Error ? e.message : 'Hata'));
                        }} style={{ padding: '2px 8px', borderRadius: 5, border: '1px solid #fee2e2', background: '#fff', color: '#dc2626', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>Eğitmen atanmamış</p>
                )}
                <TrainerAssignForm userId={detail.id} tenantTrainers={packageTypes.length > 0 ? [] : []} onSaved={() => void openDetail(detail as unknown as Member)} />
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
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {pkg.packageType.sessionType === 'personal_training'
                            ? '🏋️ PT Paketi'
                            : '💆 Masaj Paketi'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const count = prompt(
                              `Kaç seans eklensin? (Mevcut: ${pkg.remainingSessions})`,
                              '10',
                            );
                            if (!count || parseInt(count) <= 0) return;
                            void apiJson<{ newTotal: number }>(
                              `/admin/members/${detail.id}/packages/${pkg.id}/add-sessions`,
                              {
                                method: 'POST',
                                body: JSON.stringify({ sessions: parseInt(count) }),
                              },
                            )
                              .then((res) => {
                                alert(`✅ Seans eklendi. Yeni toplam: ${res.newTotal}`);
                                void openDetail(detail as unknown as Member);
                              })
                              .catch((err: unknown) =>
                                alert(err instanceof Error ? err.message : 'Hata'),
                              );
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 5,
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            color: '#2563eb',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          + Seans Ekle
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              !confirm(`"${pkg.packageType.name}" paketi silinecek. Emin misiniz?`)
                            )
                              return;
                            void apiJson(`/admin/members/${detail.id}/packages/${pkg.id}`, {
                              method: 'DELETE',
                            })
                              .then(() => {
                                void openDetail(detail as unknown as Member);
                              })
                              .catch((err: unknown) =>
                                alert(err instanceof Error ? err.message : 'Hata'),
                              );
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 5,
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            color: '#dc2626',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                          }}
                        >
                          🗑
                        </button>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <select
                      value={selectedPkgType}
                      onChange={(e) => { setSelectedPkgType(e.target.value); setSelectedPkgTrainer(''); }}
                      style={{
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
                    {(() => {
                      const pkg = packageTypes.find((p) => p.id === selectedPkgType);
                      if (pkg?.sessionType !== 'personal_training') return null;
                      return (
                        <TrainerSelectForPackage userId={detail.id} value={selectedPkgTrainer} onChange={setSelectedPkgTrainer} />
                      );
                    })()}
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

          {/* Aksiyonlar + Notlar */}
          <div
            style={{
              padding: '0 24px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
            }}
          >
            {/* Sol: Aksiyonlar + Profil Düzenle */}
            <div>
              <h3
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 12px',
                }}
              >
                ⚡ İşlemler
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={async () => {
                    if (!confirm('Şifre sıfırlanacak. Devam?')) return;
                    try {
                      const res = await apiJson<{ temporaryPassword: string }>(
                        `/admin/members/${detail.id}/reset-password`,
                        { method: 'POST' },
                      );
                      alert(`Yeni geçici şifre: ${res.temporaryPassword}\nÜyeye iletiniz.`);
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : 'Hata');
                    }
                  }}
                  style={actionBtnStyle}
                >
                  🔑 Şifre Sıfırla
                </button>
                {detail.accountStatus === 'active' && (
                  <button
                    onClick={async () => {
                      if (!confirm('Hesap dondurulacak. Devam?')) return;
                      try {
                        await apiJson(`/admin/members/${detail.id}/suspend`, {
                          method: 'POST',
                          body: JSON.stringify({}),
                        });
                        const d = await apiJson<MemberDetail>(`/admin/members/${detail.id}/detail`);
                        setDetail(d);
                        void load(statusFilter, search);
                      } catch (e) {
                        setError(e instanceof ApiError ? e.message : 'Hata');
                      }
                    }}
                    style={{ ...actionBtnStyle, color: '#d97706', borderColor: '#fef3c7' }}
                  >
                    ❄️ Hesabı Dondur
                  </button>
                )}
                {(detail.accountStatus === 'suspended' || detail.accountStatus === 'rejected') && (
                  <button
                    onClick={async () => {
                      try {
                        await apiJson(`/admin/members/${detail.id}/reactivate`, { method: 'POST' });
                        const d = await apiJson<MemberDetail>(`/admin/members/${detail.id}/detail`);
                        setDetail(d);
                        void load(statusFilter, search);
                      } catch (e) {
                        setError(e instanceof ApiError ? e.message : 'Hata');
                      }
                    }}
                    style={{ ...actionBtnStyle, color: '#059669', borderColor: '#dcfce7' }}
                  >
                    ✅ Hesabı Aktifleştir
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (
                      !confirm(
                        `${detail.firstName} ${detail.lastName} kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?`,
                      )
                    )
                      return;
                    try {
                      await apiJson(`/admin/members/${detail.id}/delete`, { method: 'DELETE' });
                      setDetail(null);
                      void load(statusFilter, search);
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : 'Hata');
                    }
                  }}
                  style={{ ...actionBtnStyle, color: '#dc2626', borderColor: '#fee2e2' }}
                >
                  🗑 Üyeyi Sil
                </button>
              </div>
            </div>

            {/* Sağ: Notlar */}
            <MemberNotes userId={detail.id} />
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
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => void openDetail(m)}
                        title="Ayarlar"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                          background: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        ⚙️
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`${m.firstName} ${m.lastName} silinecek. Emin misiniz?`))
                            return;
                          void apiJson(`/admin/members/${m.id}/delete`, { method: 'DELETE' })
                            .then(() => void load(statusFilter, search))
                            .catch((e: unknown) => alert(e instanceof Error ? e.message : 'Hata'));
                        }}
                        title="Sil"
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          border: '1px solid #fee2e2',
                          background: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        🗑
                      </button>
                    </div>
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

// ─── MemberNotes Component ──────────────────────────────────────────────────────

function MemberNotes({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<Array<{ text: string; date: string }>>([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiJson<Array<{ text: string; date: string }>>(`/admin/members/${userId}/notes`)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [userId]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await apiJson(`/admin/members/${userId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote.trim() }),
      });
      setNotes(await apiJson(`/admin/members/${userId}/notes`));
      setNewNote('');
    } catch {
      /* */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
        📝 Notlar
      </h3>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Not ekle..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addNote();
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: '0.82rem',
            background: '#fff',
            color: '#0f172a',
          }}
        />
        <button
          onClick={() => void addNote()}
          disabled={saving || !newNote.trim()}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
            opacity: !newNote.trim() ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>
      {notes.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Henüz not yok</p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {notes.map((n, i) => (
            <div
              key={i}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ color: '#0f172a' }}>{n.text}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: 2 }}>
                {new Date(n.date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#374151',
  fontWeight: 600,
  fontSize: '0.82rem',
  cursor: 'pointer',
  textAlign: 'left',
};

// ─── MembershipForm Component ───────────────────────────────────────────────────

function MembershipForm({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('monthly');
  const [duration, setDuration] = useState(1);
  const [price, setPrice] = useState('5000');
  const [saving, setSaving] = useState(false);

  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = (() => {
    const d = new Date();
    if (type === 'monthly') d.setMonth(d.getMonth() + duration);
    else d.setFullYear(d.getFullYear() + duration);
    return d.toISOString().slice(0, 10);
  })();

  async function save() {
    setSaving(true);
    try {
      await apiJson(`/admin/members/${userId}/membership`, {
        method: 'POST',
        body: JSON.stringify({
          membershipType: type,
          startDate,
          endDate,
          price: parseFloat(price) || 0,
        }),
      });
      setOpen(false);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Hata');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          marginTop: 8,
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid #e2e8f0',
          background: '#fff',
          color: '#374151',
          fontWeight: 600,
          fontSize: '0.78rem',
          cursor: 'pointer',
        }}
      >
        + Üyelik Ekle / Güncelle
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>Tip</span>
          <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
            <option value="monthly">Aylık</option>
            <option value="yearly">Yıllık</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
            {type === 'monthly' ? 'Kaç Ay' : 'Kaç Yıl'}
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={inputStyle}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {type === 'monthly' ? 'ay' : 'yıl'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>Ücret (₺)</span>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={inputStyle}
        />
      </label>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>
        📅 {startDate} → <strong>{endDate}</strong> (otomatik hesaplandı)
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => void save()}
          disabled={saving}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#2563eb',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
          }}
        >
          {saving ? '...' : '✓ Kaydet'}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#64748b',
            fontWeight: 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
          }}
        >
          İptal
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #e2e8f0',
  fontSize: '0.82rem',
  background: '#fff',
  color: '#0f172a',
};

// ─── TrainerAssignForm Component ────────────────────────────────────────────────

function TrainerAssignForm({ userId, onSaved }: { userId: string; tenantTrainers: unknown[]; onSaved: () => void }) {
  const [trainers, setTrainers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [selectedTrainer, setSelectedTrainer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiJson<Array<{ id: string; firstName: string; lastName: string; offersSessionTypes?: string[] }>>('/admin/trainers')
      .then((data) => setTrainers(data.filter((t) => t.offersSessionTypes?.includes('personal_training'))))
      .catch(() => setTrainers([]));
  }, []);

  async function assign() {
    if (!selectedTrainer) return;
    setSaving(true);
    try {
      await apiJson(`/admin/members/${userId}/assign-trainer`, {
        method: 'POST',
        body: JSON.stringify({ trainerId: selectedTrainer }),
      });
      setSelectedTrainer('');
      onSaved();
    } catch (e) { alert(e instanceof Error ? e.message : 'Hata'); }
    finally { setSaving(false); }
  }

  if (trainers.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
      <select value={selectedTrainer} onChange={(e) => setSelectedTrainer(e.target.value)}
        style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.82rem', background: '#fff', color: '#0f172a' }}>
        <option value="">Eğitmen seçin...</option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
        ))}
      </select>
      <button onClick={() => void assign()} disabled={!selectedTrainer || saving}
        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', opacity: !selectedTrainer ? 0.5 : 1 }}>
        {saving ? '...' : 'Ata'}
      </button>
    </div>
  );
}

// ─── TrainerSelectForPackage ────────────────────────────────────────────────────

function TrainerSelectForPackage({ userId, value, onChange }: { userId: string; value: string; onChange: (v: string) => void }) {
  const [trainers, setTrainers] = useState<Array<{ id: string; firstName: string; lastName: string; offersSessionTypes?: string[] }>>([]);

  useEffect(() => {
    apiJson<Array<{ id: string; firstName: string; lastName: string; offersSessionTypes?: string[] }>>('/admin/trainers')
      .then((data) => setTrainers(data.filter((t) => t.offersSessionTypes?.includes('personal_training'))))
      .catch(() => setTrainers([]));
  }, [userId]);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.8rem', background: '#fff', color: '#0f172a' }}>
      <option value="">Eğitmen seçin (zorunlu)...</option>
      {trainers.map((t) => (
        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
      ))}
    </select>
  );
}

// ─── ProfileEditor Component ────────────────────────────────────────────────────

function ProfileEditor({ detail, onSaved }: { detail: MemberDetail; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(detail.firstName);
  const [lastName, setLastName] = useState(detail.lastName);
  const [email, setEmail] = useState(detail.email);
  const [phone, setPhone] = useState(detail.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFirstName(detail.firstName);
    setLastName(detail.lastName);
    setEmail(detail.email);
    setPhone(detail.phone || '');
  }, [detail]);

  async function save() {
    setSaving(true);
    try {
      await apiJson(`/admin/members/${detail.id}/update-profile`, {
        method: 'PATCH',
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || null }),
      });
      setEditing(false);
      onSaved();
    } catch (e) { alert(e instanceof Error ? e.message : 'Hata'); }
    finally { setSaving(false); }
  }

  const fieldStyle: React.CSSProperties = editing
    ? { padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', background: '#fff', width: '100%' }
    : { fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Profil Bilgileri</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#2563eb', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
            ✏️ Düzenle
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => void save()} disabled={saving} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
              {saving ? '...' : '💾 Kaydet'}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
              İptal
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Üye ID</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>{detail.id.slice(0, 8)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Ad</span>
          {editing ? <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} /> : <span style={fieldStyle}>{detail.firstName}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Soyad</span>
          {editing ? <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} /> : <span style={fieldStyle}>{detail.lastName}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>E-posta</span>
          {editing ? <input value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} /> : <span style={fieldStyle}>{detail.email}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Telefon</span>
          {editing ? <input value={phone} onChange={(e) => setPhone(e.target.value)} style={fieldStyle} placeholder="05xx..." /> : <span style={fieldStyle}>{detail.phone || '—'}</span>}
        </div>
        <InfoRow label="Kayıt Tarihi" value={new Date(detail.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} />
        <InfoRow label="Son Giriş" value={detail.lastLogin ? new Date(detail.lastLogin).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Hiç giriş yapmadı'} />
        <InfoRow label="Durum" value={detail.accountStatus === 'active' ? 'Aktif Üye' : detail.accountStatus === 'pending_approval' ? 'Onay Bekliyor' : detail.accountStatus === 'suspended' ? 'Dondurulmuş' : 'Reddedildi'} />
      </div>
    </div>
  );
}
