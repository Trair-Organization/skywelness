import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { TherapistsPage } from './TherapistsPage';

type SpaServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  sortOrder: number;
};
type SpaBookingRow = {
  id: string;
  bookingDate: string;
  timeSlot: string;
  status: string;
  notes: string | null;
  adminNote: string | null;
  service: { id: string; name: string } | null;
  therapist: { id: string; name: string } | null;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
};

type TabType = 'bookings' | 'services' | 'therapists' | 'packages' | 'room-slots';

export function SpaManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [bookings, setBookings] = useState<SpaBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState('pending');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [svc, bk] = await Promise.all([
        apiJson<SpaServiceRow[]>('/spa/admin/services'),
        apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${bookingFilter}`),
      ]);
      setServices(svc);
      setBookings(bk);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [bookingFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  async function updateBookingStatus(id: string, status: string) {
    try {
      await apiJson(`/spa/admin/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const data = await apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${bookingFilter}`);
      setBookings(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
    }
  }

  function getStatusLabel(s: string) {
    return (
      { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' }[
        s
      ] || s
    );
  }
  function getCategoryLabel(c: string) {
    return (
      {
        relax: '🧘 Relax',
        therapy: '💆 Therapy',
        recovery: '🔄 Recovery',
        sport: '⚡ Sport',
        premium: '👑 Premium',
      }[c] || c
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Spa Hizmetleri & Rezervasyonlar</h1>
          <p className="dashboard-subtitle">Masaj hizmetlerini ve gelen rezervasyonları yönetin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'bookings' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📝 Rezervasyonlar
          </button>
          <button
            className={`filter-tab ${activeTab === 'services' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            🧴 Hizmetler ({services.length})
          </button>
          <button
            className={`filter-tab ${activeTab === 'therapists' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('therapists')}
          >
            💆 Masözler
          </button>
          <button
            className={`filter-tab ${activeTab === 'packages' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('packages')}
          >
            📦 Paketler
          </button>
          <button
            className={`filter-tab ${activeTab === 'room-slots' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('room-slots')}
          >
            🏠 Oda Slotları
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && (
        <>
          {/* Rezervasyonlar */}
          {activeTab === 'bookings' && (
            <div>
              <div className="booking-filters">
                {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    className={`btn-sm ${bookingFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setBookingFilter(s);
                    }}
                  >
                    {getStatusLabel(s)}
                  </button>
                ))}
              </div>
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>Bu durumda rezervasyon yok</p>
                </div>
              ) : (
                <div className="members-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Üye</th>
                        <th>Hizmet</th>
                        <th>Masöz</th>
                        <th>Tarih</th>
                        <th>Saat</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.user ? `${b.user.firstName} ${b.user.lastName}` : '-'}</td>
                          <td>{b.service?.name || '-'}</td>
                          <td>{b.therapist?.name || '-'}</td>
                          <td>{b.bookingDate}</td>
                          <td>{b.timeSlot}</td>
                          <td>
                            <span className={`status-badge status-spa-${b.status}`}>
                              {getStatusLabel(b.status)}
                            </span>
                          </td>
                          <td>
                            {b.status === 'pending' && (
                              <div className="action-btns">
                                <button
                                  className="btn-sm btn-success"
                                  onClick={() => void updateBookingStatus(b.id, 'confirmed')}
                                >
                                  ✓ Onayla
                                </button>
                                <button
                                  className="btn-sm btn-danger"
                                  onClick={() => void updateBookingStatus(b.id, 'cancelled')}
                                >
                                  ✗ İptal
                                </button>
                              </div>
                            )}
                            {b.status === 'confirmed' && (
                              <button
                                className="btn-sm btn-success"
                                onClick={() => void updateBookingStatus(b.id, 'completed')}
                              >
                                ✓ Tamamlandı
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
          )}

          {/* Hizmetler */}
          {activeTab === 'services' && <ServicesTab services={services} onRefresh={loadAll} getCategoryLabel={getCategoryLabel} />}

          {/* Masözler */}
          {activeTab === 'therapists' && <TherapistsPage embedded />}

          {/* Paketler */}
          {activeTab === 'packages' && <PackagesTab />}

          {/* Oda Slotları */}
          {activeTab === 'room-slots' && <RoomSlotsTab />}
        </>
      )}
    </div>
  );
}

// ─── Services CRUD Tab ───────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'relax', label: '🧘 Relax' },
  { value: 'therapy', label: '💆 Therapy' },
  { value: 'recovery', label: '🔄 Recovery' },
  { value: 'sport', label: '⚡ Sport' },
  { value: 'premium', label: '👑 Premium' },
  { value: 'cold', label: '❄️ Cold' },
];

function ServicesTab({ services, onRefresh, getCategoryLabel }: { services: SpaServiceRow[]; onRefresh: () => void; getCategoryLabel: (c: string) => string }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('relax');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setEditId(null); setName(''); setDescription(''); setCategory('relax'); setDuration(60); setPrice(''); setActive(true); setShowForm(false);
  }

  function startEdit(s: SpaServiceRow) {
    setEditId(s.id); setName(s.name); setDescription(s.description || ''); setCategory(s.category); setDuration(s.durationMinutes); setPrice(String(s.price)); setActive(s.active); setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, category, durationMinutes: duration, price: parseFloat(price), active };
      if (editId) {
        await apiJson(`/spa/admin/services/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiJson('/spa/admin/services', { method: 'POST', body: JSON.stringify(body) });
      }
      resetForm();
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hata');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, sName: string) {
    if (!confirm(`"${sName}" hizmeti silinecek. Emin misiniz?`)) return;
    try {
      await apiJson(`/spa/admin/services/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silinemedi');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Spa Hizmetleri ({services.length})</h3>
        <button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Hizmet Ekle</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSave(e)} style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.04)', marginBottom: '1.5rem', display: 'grid', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{editId ? 'Hizmet Düzenle' : 'Yeni Hizmet'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Hizmet Adı *</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Aromaterapi Masajı" required className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Kategori *</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span className="form-label">Açıklama</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hizmet açıklaması..." rows={2} className="form-input" style={{ resize: 'vertical' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Süre (dk) *</span>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Fiyat (₺) *</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2000" required className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Durum</span>
              <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')} className="form-input">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-sm btn-primary" disabled={saving}>{saving ? '⏳...' : editId ? '✓ Güncelle' : '✓ Oluştur'}</button>
            <button type="button" className="btn-sm btn-outline" onClick={resetForm}>İptal</button>
          </div>
        </form>
      )}

      {services.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">🧴</span><p>Henüz hizmet tanımlı değil</p></div>
      ) : (
        <div className="services-grid">
          {services.map((s) => (
            <div key={s.id} className="service-card">
              <div className="service-card-header">
                <span className="service-category">{getCategoryLabel(s.category)}</span>
                <span className={`service-status ${s.active ? 'active' : 'inactive'}`}>{s.active ? 'Aktif' : 'Pasif'}</span>
              </div>
              <h3 className="service-name">{s.name}</h3>
              {s.description && <p className="service-desc">{s.description.slice(0, 120)}...</p>}
              <div className="service-meta">
                <span>⏱ {s.durationMinutes} dk</span>
                <span className="service-price">₺{s.price.toLocaleString('tr-TR')}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                <button className="btn-sm btn-outline" onClick={() => startEdit(s)}>✏️ Düzenle</button>
                <button className="btn-sm btn-danger" onClick={() => void handleDelete(s.id, s.name)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Packages CRUD Tab ──────────────────────────────────────────────────────────

type SpaPackageRow = {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  price: string;
  validityDays: number;
  applicableCategories: string[];
  active: boolean;
  sortOrder: number;
};

function PackagesTab() {
  const [packages, setPackages] = useState<SpaPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionCount, setSessionCount] = useState(10);
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<SpaPackageRow[]>('/spa/admin/packages');
      setPackages(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadPackages(); }); }, [loadPackages]);

  function resetForm() {
    setEditId(null); setName(''); setDescription(''); setSessionCount(10); setPrice(''); setValidityDays(30); setActive(true); setShowForm(false);
  }

  function startEdit(p: SpaPackageRow) {
    setEditId(p.id); setName(p.name); setDescription(p.description || ''); setSessionCount(p.sessionCount); setPrice(p.price); setValidityDays(p.validityDays); setActive(p.active); setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, sessionCount, price: parseFloat(price), validityDays, active };
      if (editId) {
        await apiJson(`/spa/admin/packages/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiJson('/spa/admin/packages', { method: 'POST', body: JSON.stringify(body) });
      }
      resetForm();
      await loadPackages();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Hata');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Spa Paketleri ({packages.length})</h3>
        <button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Paket Ekle</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSave(e)} style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(56,189,248,0.2)', background: 'rgba(56,189,248,0.04)', marginBottom: '1.5rem', display: 'grid', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{editId ? 'Paket Düzenle' : 'Yeni Paket'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Paket Adı *</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 10 Seans Masaj" required className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Durum</span>
              <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')} className="form-input">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span className="form-label">Açıklama</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paket açıklaması..." rows={2} className="form-input" style={{ resize: 'vertical' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Seans Sayısı *</span>
              <input type="number" value={sessionCount} onChange={(e) => setSessionCount(Number(e.target.value))} min={1} className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Fiyat (₺) *</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15000" required className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Geçerlilik (gün) *</span>
              <input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} min={1} className="form-input" />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn-sm btn-primary" disabled={saving}>{saving ? '⏳...' : editId ? '✓ Güncelle' : '✓ Oluştur'}</button>
            <button type="button" className="btn-sm btn-outline" onClick={resetForm}>İptal</button>
          </div>
        </form>
      )}

      {packages.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">📦</span><p>Henüz paket tanımlı değil</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {packages.map((p) => (
            <div key={p.id} style={{ padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid rgba(148,163,184,0.1)', background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ color: '#e2e8f0' }}>{p.name}</strong>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 6, background: p.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: p.active ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{p.active ? 'Aktif' : 'Pasif'}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                  {p.sessionCount} seans · {p.validityDays} gün geçerli {p.description && `· ${p.description.slice(0, 60)}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>₺{parseFloat(p.price).toLocaleString('tr-TR')}</span>
                <button className="btn-sm btn-outline" onClick={() => startEdit(p)}>✏️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Room Management Tab ────────────────────────────────────────────────────────

type RoomRow = {
  id: string;
  name: string;
  resourceType: string;
  capacity: number;
  price: string;
  active: boolean;
  durationMinutes: number;
};

function RoomSlotsTab() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'rooms' | 'slots'>('rooms');

  // Room form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState(1);
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  // Slot form
  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(21);
  const [slotPrice, setSlotPrice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ created: number; roomName: string } | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<RoomRow[]>('/resource-booking/admin/resources');
      const massageRooms = data.filter((r) => r.resourceType === 'massage_room');
      setRooms(massageRooms);
      if (massageRooms.length > 0 && !selectedRoom) setSelectedRoom(massageRooms[0].id);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [selectedRoom]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadRooms();
    });
  }, [loadRooms]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;
    setSaving(true);
    try {
      await apiJson('/resource-booking/admin/resources', {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          resourceType: 'massage_room',
          capacity: formCapacity,
          durationMinutes: 60,
          price: parseFloat(formPrice),
          description: formCapacity >= 2 ? 'Çift kişilik masaj odası' : 'Tek kişilik masaj odası',
        }),
      });
      setShowForm(false);
      setFormName('');
      setFormCapacity(1);
      setFormPrice('');
      await loadRooms();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Oda oluşturulamadı');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateSlots() {
    if (!selectedRoom) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await apiJson<{ created: number; roomName: string }>(
        '/v2/schedule/generate-room-slots',
        {
          method: 'POST',
          body: JSON.stringify({
            roomId: selectedRoom,
            startDate,
            endDate,
            startHour,
            endHour,
            price: slotPrice ? parseFloat(slotPrice) : undefined,
          }),
        },
      );
      setGenResult(res);
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Slot oluşturulamadı');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn-sm ${subTab === 'rooms' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSubTab('rooms')}
        >
          🏠 Odalar ({rooms.length})
        </button>
        <button
          className={`btn-sm ${subTab === 'slots' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSubTab('slots')}
        >
          🕐 Slot Oluştur
        </button>
      </div>

      {/* ═══ Odalar ═══ */}
      {subTab === 'rooms' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Masaj Odaları</h3>
            <button className="btn-sm btn-primary" onClick={() => setShowForm(true)}>
              + Yeni Oda Ekle
            </button>
          </div>

          {/* Oda Ekleme Formu */}
          {showForm && (
            <form
              onSubmit={(e) => void handleCreateRoom(e)}
              style={{
                padding: '1.25rem',
                borderRadius: 12,
                border: '1px solid rgba(56,189,248,0.2)',
                background: 'rgba(56,189,248,0.04)',
                marginBottom: '1.5rem',
                display: 'grid',
                gap: '0.75rem',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Yeni Masaj Odası</h4>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                  Oda Adı *
                </span>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Örn: Masaj Odası 4 (Çift)"
                  required
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Kapasite *
                  </span>
                  <select
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#e2e8f0',
                    }}
                  >
                    <option value={1}>1 kişi (Tek)</option>
                    <option value={2}>2 kişi (Çift)</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Seans Fiyatı (₺) *
                  </span>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="2000"
                    required
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#e2e8f0',
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-sm btn-primary" disabled={saving}>
                  {saving ? '⏳...' : '✓ Oda Oluştur'}
                </button>
                <button
                  type="button"
                  className="btn-sm btn-outline"
                  onClick={() => setShowForm(false)}
                >
                  İptal
                </button>
              </div>
            </form>
          )}

          {/* Oda Listesi */}
          {rooms.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🏠</span>
              <p>Henüz masaj odası tanımlı değil.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {rooms.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: 12,
                    border: '1px solid rgba(148,163,184,0.1)',
                    background: 'rgba(0,0,0,0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{r.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                      {r.capacity >= 2 ? '👫 Çift kişilik' : '🧖 Tek kişilik'} · {r.durationMinutes}{' '}
                      dk
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>
                    {r.price}₺
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ Slot Oluştur ═══ */}
      {subTab === 'slots' && (
        <div style={{ maxWidth: 550 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Oda Çalışma Slotları Oluştur
          </h3>
          <p className="muted" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            Seçilen oda için belirtilen tarih ve saat aralığında müsaitlik slotları oluşturulur.
          </p>

          {rooms.length === 0 ? (
            <p className="muted">Önce bir oda ekleyin.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>Oda</span>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} kişi)
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Başlangıç Tarihi
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#e2e8f0',
                    }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Bitiş Tarihi
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#e2e8f0',
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Başlangıç Saati
                  </span>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#e2e8f0',
                    }}
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                    Bitiş Saati
                  </span>
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#e2e8f0',
                    }}
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
                  Özel Fiyat (boş = oda fiyatı)
                </span>
                <input
                  type="number"
                  value={slotPrice}
                  onChange={(e) => setSlotPrice(e.target.value)}
                  placeholder="Opsiyonel"
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {(() => {
                  const days =
                    Math.ceil(
                      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000,
                    ) + 1;
                  return `${days} gün × ${endHour - startHour} slot = ${days * (endHour - startHour)} slot`;
                })()}
              </p>
              <button
                onClick={() => void handleGenerateSlots()}
                disabled={generating || !selectedRoom}
                style={{
                  padding: '0.85rem',
                  borderRadius: 10,
                  background: '#38bdf8',
                  color: '#0a0f1a',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: generating ? 0.5 : 1,
                }}
              >
                {generating ? '⏳ Oluşturuluyor...' : '🏠 Slotları Oluştur'}
              </button>
              {genResult && (
                <p style={{ color: '#10b981', fontWeight: 700 }}>
                  ✅ {genResult.created} slot oluşturuldu ({genResult.roomName})
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
