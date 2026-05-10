import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type PackageType = {
  id: string;
  name: string;
  sessionCount: number;
  price: string;
  currency: string;
  validityDays: number;
  sessionType: string;
  active: boolean;
  createdAt: string;
};

const SESSION_TYPES = [
  { value: 'personal_training', label: 'Personal Training' },
  { value: 'massage', label: 'Masaj' },
];

type PackageRequest = {
  id: string;
  userId: string;
  sessionType: string;
  message: string | null;
  status: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
};

type TabType = 'types' | 'requests';

export function PackageTypesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('types');
  const [types, setTypes] = useState<PackageType[]>([]);
  const [requests, setRequests] = useState<PackageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    sessionCount: '10',
    price: '',
    validityDays: '90',
    sessionType: 'personal_training',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesData, requestsData] = await Promise.all([
        apiJson<PackageType[]>('/admin/package-types'),
        apiJson<PackageRequest[]>('/admin/package-requests'),
      ]);
      setTypes(typesData);
      setRequests(requestsData);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  function resetForm() {
    setForm({
      name: '',
      sessionCount: '10',
      price: '',
      validityDays: '90',
      sessionType: 'personal_training',
    });
    setEditId(null);
  }

  function openEdit(pt: PackageType) {
    setForm({
      name: pt.name,
      sessionCount: pt.sessionCount.toString(),
      price: pt.price,
      validityDays: pt.validityDays.toString(),
      sessionType: pt.sessionType,
    });
    setEditId(pt.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        sessionCount: Number(form.sessionCount),
        price: Number(form.price),
        validityDays: Number(form.validityDays),
        sessionType: form.sessionType,
      };
      if (editId) {
        await apiJson(`/admin/package-types/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson('/admin/package-types', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu paket tipini silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/admin/package-types/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Silinemedi');
    }
  }

  async function toggleActive(pt: PackageType) {
    await apiJson(`/admin/package-types/${pt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !pt.active }),
    });
    await load();
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Paket Yönetimi</h1>
          <p className="dashboard-subtitle">
            Paket tiplerini yönetin ve gelen talepleri görüntüleyin
          </p>
        </div>
        {activeTab === 'types' && (
          <button
            className="btn-primary-lg"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Yeni Paket Tipi
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="schedule-tabs" style={{ marginBottom: 16 }}>
        <button
          className={`schedule-tab ${activeTab === 'types' ? 'schedule-tab-active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          📦 Paket Tipleri
          <span className="schedule-tab-badge">{types.length}</span>
        </button>
        <button
          className={`schedule-tab ${activeTab === 'requests' ? 'schedule-tab-active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📋 Gelen Talepler
          {requests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="schedule-tab-badge" style={{ background: '#ef4444', color: '#fff' }}>
              {requests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {/* ═══ PAKET TİPLERİ TAB ═══ */}
      {activeTab === 'types' && (
        <>
          {showForm && (
            <div className="card" style={{ marginBottom: 24 }}>
              <h3>{editId ? '✏️ Paket Düzenle' : '➕ Yeni Paket Tipi'}</h3>
              <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
                <label>
                  Paket Adı *
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Örn: 10 Seans PT Paketi"
                  />
                </label>
                <label>
                  Seans Sayısı *
                  <input
                    type="number"
                    value={form.sessionCount}
                    onChange={(e) => setForm({ ...form, sessionCount: e.target.value })}
                    required
                    min={1}
                  />
                </label>
                <label>
                  Fiyat (₺) *
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                    min={0}
                    step="0.01"
                    placeholder="5000"
                  />
                </label>
                <label>
                  Geçerlilik (gün) *
                  <input
                    type="number"
                    value={form.validityDays}
                    onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
                    required
                    min={1}
                  />
                </label>
                <label>
                  Hizmet Türü *
                  <select
                    value={form.sessionType}
                    onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                  >
                    {SESSION_TYPES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-actions">
                  <button type="submit" className="primary" disabled={saving}>
                    {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Oluştur'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <p className="muted">Yükleniyor...</p>
          ) : types.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📦</span>
              <p>Henüz paket tipi oluşturmadınız</p>
              <p className="muted">
                Üyelerinize satacağınız PT ve masaj paketlerini buradan tanımlayın.
              </p>
            </div>
          ) : (
            <div className="services-grid">
              {types.map((pt) => (
                <div key={pt.id} className="service-card">
                  <div className="service-card-header">
                    <span className="service-category">
                      {pt.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                    </span>
                    <span className={`service-status ${pt.active ? 'active' : 'inactive'}`}>
                      {pt.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <h3 className="service-name">{pt.name}</h3>
                  <div className="service-meta">
                    <span>🎯 {pt.sessionCount} seans</span>
                    <span className="service-price">
                      ₺{Number(pt.price).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 6 }}>
                    📅 {pt.validityDays} gün geçerli
                  </div>
                  <div className="trainer-actions">
                    <button className="btn-sm btn-outline" onClick={() => void toggleActive(pt)}>
                      {pt.active ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
                    </button>
                    <button className="btn-sm btn-outline" onClick={() => openEdit(pt)}>
                      ✏️ Düzenle
                    </button>
                    <button className="btn-sm btn-danger" onClick={() => void handleDelete(pt.id)}>
                      🗑 Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ GELEN TALEPLER — SATIŞ PİPELINE ═══ */}
      {activeTab === 'requests' && (
        <>
          {loading ? (
            <p className="muted">Yükleniyor...</p>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <p>Henüz paket talebi yok</p>
              <p className="muted">
                Üyeler mobil uygulamadan paket talep ettiğinde burada görünecek.
              </p>
            </div>
          ) : (
            <div className="pipeline-board">
              {(['pending', 'contacted', 'approved', 'rejected'] as const).map((col) => {
                const colConfig = {
                  pending: { title: '🆕 Yeni Talepler', color: 'var(--accent)' },
                  contacted: { title: '📞 İletişime Geçildi', color: '#f59e0b' },
                  approved: { title: '✅ Tamamlanan', color: '#22c55e' },
                  rejected: { title: '❌ Kaybedilen', color: '#ef4444' },
                }[col];
                const colRequests =
                  col === 'contacted'
                    ? requests.filter(
                        (r) => r.status === 'contacted' || r.status === 'payment_pending',
                      )
                    : requests.filter((r) => r.status === col);
                return (
                  <div key={col} className="pipeline-col">
                    <h4 className="pipeline-col-title" style={{ color: colConfig.color }}>
                      {colConfig.title} ({colRequests.length})
                    </h4>
                    {colRequests.map((r) => (
                      <div key={r.id} className="pipeline-card">
                        <div className="pipeline-card-name">
                          {r.user.firstName} {r.user.lastName}
                        </div>
                        <div className="pipeline-card-meta">
                          {r.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'} ·{' '}
                          {new Date(r.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        {r.message && <div className="pipeline-card-msg">{r.message}</div>}
                        {(col === 'pending' || col === 'contacted') && (
                          <div className="pipeline-card-actions">
                            {r.user.phone && (
                              <a
                                href={`tel:${r.user.phone}`}
                                className="btn-sm btn-outline"
                                style={{ textDecoration: 'none' }}
                              >
                                📞
                              </a>
                            )}
                            {col === 'pending' && (
                              <button
                                className="btn-sm btn-outline"
                                onClick={() => {
                                  void apiJson(`/admin/package-requests/${r.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ status: 'contacted' }),
                                  }).then(() => load());
                                }}
                              >
                                📞 Geçildi
                              </button>
                            )}
                            {col === 'contacted' && (
                              <button
                                className="btn-sm btn-outline"
                                onClick={() => {
                                  const note = prompt('Not ekle:');
                                  if (!note) return;
                                  void apiJson(`/admin/package-requests/${r.id}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ adminNote: note }),
                                  }).then(() => load());
                                }}
                              >
                                📝 Not
                              </button>
                            )}
                            <button
                              className="btn-sm btn-outline"
                              style={{ color: '#22c55e', borderColor: '#22c55e' }}
                              onClick={() => {
                                const pt =
                                  types.find((t) => t.sessionType === r.sessionType) || types[0];
                                if (!pt) {
                                  alert('Paket tipi yok');
                                  return;
                                }
                                void apiJson(`/admin/package-requests/${r.id}/approve`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    packageTypeId: pt.id,
                                    paymentStatus: 'paid',
                                    paymentMethod: 'nakit',
                                  }),
                                })
                                  .then(() => {
                                    alert(`✅ ${pt.name} atandı`);
                                    return load();
                                  })
                                  .catch((e: unknown) =>
                                    alert(e instanceof ApiError ? e.message : 'Hata'),
                                  );
                              }}
                            >
                              ✅ Ata
                            </button>
                            <button
                              className="btn-sm btn-danger"
                              onClick={() => {
                                void apiJson(`/admin/package-requests/${r.id}/reject`, {
                                  method: 'POST',
                                  body: JSON.stringify({}),
                                }).then(() => load());
                              }}
                            >
                              ❌
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {colRequests.length === 0 && (
                      <p className="muted" style={{ fontSize: '0.82rem', textAlign: 'center' }}>
                        —
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
