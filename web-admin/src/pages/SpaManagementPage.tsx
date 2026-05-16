import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { TherapistsPage } from './TherapistsPage';

// ─── Types ──────────────────────────────────────────────────────────────────────

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

type AppointmentRow = {
  id: string;
  status: string;
  totalAmount: string;
  paymentStatus: string;
  notes: string | null;
  adminNote: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  service: { id: string; name: string; category: string };
  slot: { id: string; date: string; startTime: string; endTime: string };
};

type TabType = 'overview' | 'appointments' | 'services' | 'therapists' | 'packages' | 'rooms';

// ─── Main Component ─────────────────────────────────────────────────────────────

export function SpaManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { key: TabType; icon: string; label: string }[] = [
    { key: 'overview', icon: '📊', label: 'Özet' },
    { key: 'appointments', icon: '📅', label: 'Randevular' },
    { key: 'services', icon: '🧴', label: 'Hizmetler' },
    { key: 'therapists', icon: '💆', label: 'Masözler' },
    { key: 'packages', icon: '📦', label: 'Paketler' },
    { key: 'rooms', icon: '🏠', label: 'Odalar' },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">💆 Spa Yönetimi</h1>
          <p className="dashboard-subtitle">Hizmetler, masözler, randevular ve odalar — tek panelden yönetin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`filter-tab ${activeTab === t.key ? 'filter-tab-active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'appointments' && <AppointmentsTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'therapists' && <TherapistsPage embedded />}
      {activeTab === 'packages' && <PackagesTab />}
      {activeTab === 'rooms' && <RoomsTab />}
    </div>
  );
}


// ─── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<{
    pendingBookings: number;
    todayBookings: number;
    completedToday: number;
    activeTherapists: number;
    totalServices: number;
    recentBookings: SpaBookingRow[];
    pendingAppointments: AppointmentRow[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiJson<SpaBookingRow[]>('/spa/admin/bookings?status=pending'),
      apiJson<SpaBookingRow[]>('/spa/admin/bookings?status=confirmed'),
      apiJson<SpaBookingRow[]>('/spa/admin/bookings?status=completed'),
      apiJson<SpaServiceRow[]>('/spa/admin/services'),
      apiJson<AppointmentRow[]>('/v2/appointments?status=pending').catch(() => [] as AppointmentRow[]),
    ]).then(([pending, confirmed, completed, services, appointments]) => {
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const todayConfirmed = confirmed.filter(b => b.bookingDate === today);
      const todayCompleted = completed.filter(b => b.bookingDate === today);
      setData({
        pendingBookings: pending.length + appointments.length,
        todayBookings: todayConfirmed.length,
        completedToday: todayCompleted.length,
        activeTherapists: 0,
        totalServices: services.length,
        recentBookings: [...pending, ...todayConfirmed].slice(0, 5),
        pendingAppointments: appointments.slice(0, 5),
      });
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="muted">Yükleniyor...</p>;
  if (!data) return <p className="muted">Veri alınamadı.</p>;

  return (
    <div>
      {/* Stat Cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon="⏳" label="Bekleyen Onay" value={data.pendingBookings} color="#f59e0b" />
        <StatCard icon="📅" label="Bugün Randevu" value={data.todayBookings} color="#2563eb" />
        <StatCard icon="✅" label="Bugün Tamamlanan" value={data.completedToday} color="#059669" />
        <StatCard icon="🧴" label="Toplam Hizmet" value={data.totalServices} color="#8b5cf6" />
      </div>

      {/* Pending Actions */}
      {data.pendingBookings > 0 && (
        <div className="spa-section">
          <h3 className="spa-section-title">⏳ Onay Bekleyen Randevular</h3>
          <div className="spa-list">
            {data.recentBookings.map((b) => (
              <div key={b.id} className="spa-list-item">
                <div className="spa-list-item-left">
                  <strong>{b.user ? `${b.user.firstName} ${b.user.lastName}` : '—'}</strong>
                  <span className="spa-list-meta">{b.service?.name || '—'} · {b.therapist?.name || 'Masöz atanmadı'}</span>
                </div>
                <div className="spa-list-item-right">
                  <span className="spa-date">{b.bookingDate}</span>
                  <span className="spa-time">{b.timeSlot}</span>
                </div>
              </div>
            ))}
            {data.pendingAppointments.map((a) => (
              <div key={a.id} className="spa-list-item">
                <div className="spa-list-item-left">
                  <strong>{a.user.firstName} {a.user.lastName}</strong>
                  <span className="spa-list-meta">{a.service.name} · Oda Randevusu</span>
                </div>
                <div className="spa-list-item-right">
                  <span className="spa-date">{a.slot.date}</span>
                  <span className="spa-time">{a.slot.startTime}–{a.slot.endTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
    </div>
  );
}


// ─── Appointments Tab (Unified: spa_booking + v2/appointments) ──────────────────

function AppointmentsTab() {
  const [spaBookings, setSpaBookings] = useState<SpaBookingRow[]>([]);
  const [roomAppointments, setRoomAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [source, setSource] = useState<'all' | 'therapist' | 'room'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [spa, room] = await Promise.all([
        apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${statusFilter}`),
        apiJson<AppointmentRow[]>(`/v2/appointments?status=${statusFilter}`).catch(() => [] as AppointmentRow[]),
      ]);
      setSpaBookings(spa);
      setRoomAppointments(room);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  async function updateSpaStatus(id: string, status: string) {
    try {
      await apiJson(`/spa/admin/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      void load();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'İşlem başarısız'); }
  }

  async function updateRoomStatus(id: string, status: string) {
    try {
      await apiJson(`/v2/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      void load();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'İşlem başarısız'); }
  }

  const STATUS_LABELS: Record<string, string> = { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' };

  const filteredSpa = source === 'room' ? [] : spaBookings;
  const filteredRoom = source === 'therapist' ? [] : roomAppointments;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="booking-filters">
          {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <button key={s} className={`btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
          {[
            { key: 'all', label: 'Tümü' },
            { key: 'therapist', label: '💆 Masöz' },
            { key: 'room', label: '🏠 Oda' },
          ].map((opt) => (
            <button key={opt.key} className={`btn-sm ${source === opt.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSource(opt.key as typeof source)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && filteredSpa.length === 0 && filteredRoom.length === 0 && (
        <div className="empty-state"><span className="empty-icon">📅</span><p>Bu filtrede randevu yok</p></div>
      )}

      {!loading && (filteredSpa.length > 0 || filteredRoom.length > 0) && (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Üye</th>
                <th>Hizmet</th>
                <th>Masöz / Oda</th>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Tutar</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredSpa.map((b) => (
                <tr key={`spa-${b.id}`}>
                  <td><span className="badge-therapist">💆 Masöz</span></td>
                  <td><strong>{b.user ? `${b.user.firstName} ${b.user.lastName}` : '—'}</strong></td>
                  <td>{b.service?.name || '—'}</td>
                  <td>{b.therapist?.name || '—'}</td>
                  <td>{b.bookingDate}</td>
                  <td>{b.timeSlot}</td>
                  <td>—</td>
                  <td>
                    {b.status === 'pending' && (
                      <div className="action-btns">
                        <button className="btn-sm btn-success" onClick={() => void updateSpaStatus(b.id, 'confirmed')}>✓</button>
                        <button className="btn-sm btn-danger" onClick={() => void updateSpaStatus(b.id, 'cancelled')}>✕</button>
                      </div>
                    )}
                    {b.status === 'confirmed' && (
                      <button className="btn-sm btn-success" onClick={() => void updateSpaStatus(b.id, 'completed')}>✓ Tamamla</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRoom.map((a) => (
                <tr key={`room-${a.id}`}>
                  <td><span className="badge-room">🏠 Oda</span></td>
                  <td><strong>{a.user.firstName} {a.user.lastName}</strong></td>
                  <td>{a.service.name}</td>
                  <td>Masaj Odası</td>
                  <td>{a.slot.date}</td>
                  <td>{a.slot.startTime}–{a.slot.endTime}</td>
                  <td><span style={{ color: '#059669', fontWeight: 700 }}>{a.totalAmount}₺</span></td>
                  <td>
                    {a.status === 'pending' && (
                      <div className="action-btns">
                        <button className="btn-sm btn-success" onClick={() => void updateRoomStatus(a.id, 'confirmed')}>✓</button>
                        <button className="btn-sm btn-danger" onClick={() => void updateRoomStatus(a.id, 'cancelled')}>✕</button>
                      </div>
                    )}
                    {a.status === 'confirmed' && (
                      <button className="btn-sm btn-success" onClick={() => void updateRoomStatus(a.id, 'completed')}>✓ Tamamla</button>
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


// ─── Services CRUD Tab ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'relax', label: '🧘 Relax' },
  { value: 'therapy', label: '💆 Therapy' },
  { value: 'recovery', label: '🔄 Recovery' },
  { value: 'sport', label: '⚡ Sport' },
  { value: 'premium', label: '👑 Premium' },
  { value: 'cold', label: '❄️ Cold' },
];

function getCategoryLabel(c: string) {
  return CATEGORIES.find(cat => cat.value === c)?.label || c;
}

function ServicesTab() {
  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('relax');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try { setServices(await apiJson<SpaServiceRow[]>('/spa/admin/services')); }
    catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadServices(); }); }, [loadServices]);

  function resetForm() { setEditId(null); setName(''); setDescription(''); setCategory('relax'); setDuration(60); setPrice(''); setActive(true); setShowForm(false); }

  function startEdit(s: SpaServiceRow) { setEditId(s.id); setName(s.name); setDescription(s.description || ''); setCategory(s.category); setDuration(s.durationMinutes); setPrice(String(s.price)); setActive(s.active); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, category, durationMinutes: duration, price: parseFloat(price), active };
      if (editId) { await apiJson(`/spa/admin/services/${editId}`, { method: 'PATCH', body: JSON.stringify(body) }); }
      else { await apiJson('/spa/admin/services', { method: 'POST', body: JSON.stringify(body) }); }
      resetForm(); await loadServices();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, sName: string) {
    if (!confirm(`"${sName}" hizmeti silinecek. Emin misiniz?`)) return;
    try { await apiJson(`/spa/admin/services/${id}`, { method: 'DELETE' }); await loadServices(); }
    catch (err) { alert(err instanceof Error ? err.message : 'Silinemedi'); }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="spa-section-title" style={{ margin: 0 }}>Spa Hizmetleri ({services.length})</h3>
        <button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Hizmet Ekle</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSave(e)} className="spa-form-panel" style={{ display: 'grid', gap: '0.75rem' }}>
          <h4>{editId ? '✏️ Hizmet Düzenle' : '+ Yeni Hizmet'}</h4>
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
              {s.description && <p className="service-desc">{s.description.slice(0, 120)}</p>}
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
    try { setPackages(await apiJson<SpaPackageRow[]>('/spa/admin/packages')); }
    catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadPackages(); }); }, [loadPackages]);

  function resetForm() { setEditId(null); setName(''); setDescription(''); setSessionCount(10); setPrice(''); setValidityDays(30); setActive(true); setShowForm(false); }

  function startEdit(p: SpaPackageRow) { setEditId(p.id); setName(p.name); setDescription(p.description || ''); setSessionCount(p.sessionCount); setPrice(p.price); setValidityDays(p.validityDays); setActive(p.active); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, sessionCount, price: parseFloat(price), validityDays, active };
      if (editId) { await apiJson(`/spa/admin/packages/${editId}`, { method: 'PATCH', body: JSON.stringify(body) }); }
      else { await apiJson('/spa/admin/packages', { method: 'POST', body: JSON.stringify(body) }); }
      resetForm(); await loadPackages();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 className="spa-section-title" style={{ margin: 0 }}>Spa Paketleri ({packages.length})</h3>
        <button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Paket Ekle</button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSave(e)} className="spa-form-panel" style={{ display: 'grid', gap: '0.75rem' }}>
          <h4>{editId ? '✏️ Paket Düzenle' : '+ Yeni Paket'}</h4>
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
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
            <div key={p.id} className="spa-pkg-card">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong>{p.name}</strong>
                  <span className={`badge-status ${p.active ? 'badge-active' : 'badge-inactive'}`}>{p.active ? 'Aktif' : 'Pasif'}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                  {p.sessionCount} seans · {p.validityDays} gün geçerli {p.description && `· ${p.description.slice(0, 60)}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="spa-pkg-price">₺{parseFloat(p.price).toLocaleString('tr-TR')}</span>
                <button className="btn-sm btn-outline" onClick={() => startEdit(p)}>✏️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── Rooms & Slots Tab ──────────────────────────────────────────────────────────

type RoomRow = {
  id: string;
  name: string;
  resourceType: string;
  capacity: number;
  price: string;
  active: boolean;
  durationMinutes: number;
};

function RoomsTab() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'rooms' | 'slots'>('rooms');

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState(1);
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
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
    } catch { /* */ }
    finally { setLoading(false); }
  }, [selectedRoom]);

  useEffect(() => { queueMicrotask(() => { void loadRooms(); }); }, [loadRooms]);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;
    setSaving(true);
    try {
      await apiJson('/resource-booking/admin/resources', {
        method: 'POST',
        body: JSON.stringify({ name: formName.trim(), resourceType: 'massage_room', capacity: formCapacity, durationMinutes: 60, price: parseFloat(formPrice), description: formCapacity >= 2 ? 'Çift kişilik masaj odası' : 'Tek kişilik masaj odası' }),
      });
      setShowForm(false); setFormName(''); setFormCapacity(1); setFormPrice('');
      await loadRooms();
    } catch (err) { alert(err instanceof Error ? err.message : 'Oda oluşturulamadı'); }
    finally { setSaving(false); }
  }

  async function handleGenerateSlots() {
    if (!selectedRoom) return;
    setGenerating(true); setGenResult(null);
    try {
      const res = await apiJson<{ created: number; roomName: string }>('/v2/schedule/generate-room-slots', {
        method: 'POST',
        body: JSON.stringify({ roomId: selectedRoom, startDate, endDate, startHour, endHour, price: slotPrice ? parseFloat(slotPrice) : undefined }),
      });
      setGenResult(res);
    } catch (err) { alert(err instanceof Error ? err.message : 'Slot oluşturulamadı'); }
    finally { setGenerating(false); }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button className={`btn-sm ${subTab === 'rooms' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('rooms')}>🏠 Odalar ({rooms.length})</button>
        <button className={`btn-sm ${subTab === 'slots' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('slots')}>🕐 Slot Oluştur</button>
      </div>

      {subTab === 'rooms' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 className="spa-section-title" style={{ margin: 0 }}>Masaj Odaları</h3>
            <button className="btn-sm btn-primary" onClick={() => setShowForm(true)}>+ Yeni Oda</button>
          </div>

          {showForm && (
            <form onSubmit={(e) => void handleCreateRoom(e)} className="spa-form-panel" style={{ display: 'grid', gap: '0.75rem' }}>
              <h4>Yeni Masaj Odası</h4>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span className="form-label">Oda Adı *</span>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Örn: Masaj Odası 4 (Çift)" required className="form-input" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Kapasite *</span>
                  <select value={formCapacity} onChange={(e) => setFormCapacity(Number(e.target.value))} className="form-input">
                    <option value={1}>1 kişi (Tek)</option>
                    <option value={2}>2 kişi (Çift)</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Seans Fiyatı (₺) *</span>
                  <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="2000" required className="form-input" />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-sm btn-primary" disabled={saving}>{saving ? '⏳...' : '✓ Oda Oluştur'}</button>
                <button type="button" className="btn-sm btn-outline" onClick={() => setShowForm(false)}>İptal</button>
              </div>
            </form>
          )}

          {rooms.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">🏠</span><p>Henüz masaj odası tanımlı değil</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {rooms.map((r) => (
                <div key={r.id} className="spa-pkg-card">
                  <div>
                    <strong>{r.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{r.capacity >= 2 ? '👫 Çift kişilik' : '🧖 Tek kişilik'} · {r.durationMinutes} dk</div>
                  </div>
                  <span className="spa-pkg-price">{r.price}₺</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'slots' && (
        <div style={{ maxWidth: 550 }}>
          <h3 className="spa-section-title">Oda Çalışma Slotları Oluştur</h3>
          <p className="muted" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>Seçilen oda için belirtilen tarih ve saat aralığında müsaitlik slotları oluşturulur.</p>

          {rooms.length === 0 ? (
            <p className="muted">Önce bir oda ekleyin.</p>
          ) : (
            <div className="spa-form-panel" style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span className="form-label">Oda</span>
                <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className="form-input">
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.capacity} kişi)</option>)}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Başlangıç Tarihi</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Bitiş Tarihi</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-input" />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Başlangıç Saati</span>
                  <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="form-input">
                    {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Bitiş Saati</span>
                  <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="form-input">
                    {Array.from({ length: 16 }, (_, i) => i + 8).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                  </select>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span className="form-label">Özel Fiyat (boş = oda fiyatı)</span>
                <input type="number" value={slotPrice} onChange={(e) => setSlotPrice(e.target.value)} placeholder="Opsiyonel" className="form-input" />
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                {(() => { const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1; return `${days} gün × ${endHour - startHour} slot = ${days * (endHour - startHour)} slot`; })()}
              </p>
              <button onClick={() => void handleGenerateSlots()} disabled={generating || !selectedRoom} className="btn-sm btn-primary" style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                {generating ? '⏳ Oluşturuluyor...' : '🏠 Slotları Oluştur'}
              </button>
              {genResult && <p style={{ color: '#059669', fontWeight: 700, margin: 0 }}>✅ {genResult.created} slot oluşturuldu ({genResult.roomName})</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
