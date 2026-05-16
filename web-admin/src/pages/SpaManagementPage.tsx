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

type TabType = 'agenda' | 'appointments' | 'services' | 'therapists' | 'packages' | 'rooms';

// ─── Main Component ─────────────────────────────────────────────────────────────

export function SpaManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('agenda');

  const tabs: { key: TabType; icon: string; label: string }[] = [
    { key: 'agenda', icon: '📅', label: 'Ajanda' },
    { key: 'appointments', icon: '📝', label: 'Randevular' },
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

      {activeTab === 'agenda' && <AgendaTab />}
      {activeTab === 'appointments' && <AppointmentsTab />}
      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'therapists' && <TherapistsPage embedded />}
      {activeTab === 'packages' && <PackagesTab />}
      {activeTab === 'rooms' && <RoomsTab />}
    </div>
  );
}


// ─── Agenda Tab (Calendar Grid) ─────────────────────────────────────────────────

type AgendaSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  booked: boolean;
  reservation: { id: string; memberName: string | null; status: string } | null;
};

type TherapistAgenda = {
  therapistId: string;
  therapistName: string;
  photoUrl: string | null;
  slots: AgendaSlot[];
};

function AgendaTab() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [agenda, setAgenda] = useState<TherapistAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week'>('day');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let from = date;
      let to = date;
      if (view === 'week') {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        from = monday.toISOString().slice(0, 10);
        to = sunday.toISOString().slice(0, 10);
      }
      const data = await apiJson<TherapistAgenda[]>(`/admin/therapists/agenda?from=${from}&to=${to}`);
      setAgenda(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [date, view]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  function navigateDate(offset: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + (view === 'week' ? offset * 7 : offset));
    setDate(d.toISOString().slice(0, 10));
  }

  // Generate time slots for the grid (11:00 to 22:00 for Skyland Wellness)
  const hours = Array.from({ length: 11 }, (_, i) => `${String(i + 11).padStart(2, '0')}:00`);

  // For week view, get days
  const weekDays: string[] = [];
  if (view === 'week') {
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      weekDays.push(day.toISOString().slice(0, 10));
    }
  }

  const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  return (
    <div>
      {/* Toolbar */}
      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <button className="btn-sm btn-outline" onClick={() => navigateDate(-1)}>‹</button>
          <button className="btn-sm btn-outline" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Bugün</button>
          <button className="btn-sm btn-outline" onClick={() => navigateDate(1)}>›</button>
          <span className="agenda-date-label">
            {view === 'day'
              ? new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
              : `${new Date(weekDays[0] || date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} — ${new Date(weekDays[6] || date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
            }
          </span>
        </div>
        <div className="agenda-view-toggle">
          <button className={`btn-sm ${view === 'day' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('day')}>Günlük</button>
          <button className={`btn-sm ${view === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('week')}>Haftalık</button>
        </div>
      </div>

      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && agenda.length === 0 && (
        <div className="empty-state"><span className="empty-icon">💆</span><p>Aktif masöz bulunamadı. Önce masöz ekleyin ve çalışma slotları oluşturun.</p></div>
      )}

      {/* Daily Grid View */}
      {!loading && agenda.length > 0 && view === 'day' && (
        <div className="agenda-grid-wrapper">
          <div className="agenda-grid">
            {/* Header row - hours */}
            <div className="agenda-row agenda-header-row">
              <div className="agenda-cell agenda-label-cell">Masöz</div>
              {hours.map((h) => {
                const nextH = `${String(parseInt(h) + 1).padStart(2, '0')}:00`;
                return (
                  <div key={h} className="agenda-cell agenda-hour-cell">{h}–{nextH}</div>
                );
              })}
            </div>
            {/* Therapist rows */}
            {agenda.map((t) => {
              const daySlots = t.slots.filter((s) => s.date === date);
              return (
                <div key={t.therapistId} className="agenda-row">
                  <div className="agenda-cell agenda-label-cell">
                    <div className="agenda-therapist-name">{t.therapistName}</div>
                    <div className="agenda-therapist-stat">
                      {daySlots.filter(s => s.booked).length}/{daySlots.length} dolu
                    </div>
                  </div>
                  {hours.map((h) => {
                    const slot = daySlots.find((s) => s.startTime === h);
                    if (!slot) return <div key={h} className="agenda-cell agenda-slot-cell agenda-slot-empty" />;
                    if (slot.booked && slot.reservation) {
                      return (
                        <div key={h} className="agenda-cell agenda-slot-cell agenda-slot-booked" title={`${slot.reservation.memberName || 'Üye'} · ${slot.startTime}–${slot.endTime}`}>
                          <span className="agenda-slot-name">{slot.reservation.memberName?.split(' ')[0] || '—'}</span>
                          <span className="agenda-slot-time">{slot.startTime}–{slot.endTime}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={h} className="agenda-cell agenda-slot-cell agenda-slot-available" title={`Müsait: ${slot.startTime}–${slot.endTime}`}>
                        <span className="agenda-slot-time">{slot.startTime}–{slot.endTime}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Grid View */}
      {!loading && agenda.length > 0 && view === 'week' && (
        <div className="agenda-grid-wrapper">
          <div className="agenda-grid agenda-grid-week">
            {/* Header row - days */}
            <div className="agenda-row agenda-header-row">
              <div className="agenda-cell agenda-label-cell">Masöz</div>
              {weekDays.map((d, i) => (
                <div key={d} className={`agenda-cell agenda-hour-cell ${d === new Date().toISOString().slice(0, 10) ? 'agenda-today' : ''}`}>
                  <div>{DAY_NAMES[i]}</div>
                  <div style={{ fontWeight: 700 }}>{new Date(d).getDate()}</div>
                </div>
              ))}
            </div>
            {/* Therapist rows */}
            {agenda.map((t) => (
              <div key={t.therapistId} className="agenda-row">
                <div className="agenda-cell agenda-label-cell">
                  <div className="agenda-therapist-name">{t.therapistName}</div>
                </div>
                {weekDays.map((d) => {
                  const daySlots = t.slots.filter((s) => s.date === d);
                  const booked = daySlots.filter(s => s.booked).length;
                  const total = daySlots.length;
                  if (total === 0) return <div key={d} className="agenda-cell agenda-slot-cell agenda-slot-empty"><span className="agenda-slot-time">—</span></div>;
                  const pct = Math.round((booked / total) * 100);
                  return (
                    <div key={d} className={`agenda-cell agenda-slot-cell ${pct >= 80 ? 'agenda-slot-booked' : pct > 0 ? 'agenda-slot-partial' : 'agenda-slot-available'}`}>
                      <span className="agenda-slot-name">{booked}/{total}</span>
                      <span className="agenda-slot-time">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
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
