import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { TrainersManagementPage } from './TrainersManagementPage';

type TabType = 'agenda' | 'reservations' | 'trainers' | 'packages' | 'reports';

export function PtManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('agenda');

  const tabs: { key: TabType; icon: string; label: string }[] = [
    { key: 'agenda', icon: '📅', label: 'Ajanda' },
    { key: 'reservations', icon: '📋', label: 'Randevu Yönetimi' },
    { key: 'trainers', icon: '🏋️', label: 'Eğitmenler' },
    { key: 'packages', icon: '📦', label: 'PT Paketleri' },
    { key: 'reports', icon: '📊', label: 'Raporlar' },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🏋️ PT Yönetimi</h1>
          <p className="dashboard-subtitle">Eğitmenler, randevular ve PT paketleri — tek panelden yönetin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`filter-tab ${activeTab === t.key ? 'filter-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'agenda' && <PtAgendaTab />}
      {activeTab === 'reservations' && <PtReservationsTab />}
      {activeTab === 'trainers' && <TrainersManagementPage embedded />}
      {activeTab === 'packages' && <PtPackagesTab />}
      {activeTab === 'reports' && <PtReportsTab />}
    </div>
  );
}


// ─── PT Agenda Tab ──────────────────────────────────────────────────────────────

type AgendaSlot = { id: string; date: string; startTime: string; endTime: string; available: boolean; booked: boolean; reservation: { id: string; memberName: string | null; status: string } | null };
type TrainerAgenda = { trainerId: string; trainerName: string; photoUrl: string | null; slots: AgendaSlot[] };

function PtAgendaTab() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [agenda, setAgenda] = useState<TrainerAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTrainer, setFilterTrainer] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TrainerAgenda[]>(`/admin/trainers/agenda?from=${date}&to=${date}`);
      setAgenda(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  function navigateDate(offset: number) { const d = new Date(date); d.setDate(d.getDate() + offset); setDate(d.toISOString().slice(0, 10)); }

  const filteredAgenda = filterTrainer === 'all' ? agenda : agenda.filter(t => t.trainerId === filterTrainer);
  const allSlotTimes = filteredAgenda.flatMap(t => t.slots.filter(s => s.date === date).map(s => parseInt(s.startTime)));
  const minHour = allSlotTimes.length > 0 ? Math.min(...allSlotTimes) : 9;
  const maxHour = allSlotTimes.length > 0 ? Math.max(...allSlotTimes) + 1 : 22;
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => `${String(i + minHour).padStart(2, '0')}:00`);

  const totalSlots = filteredAgenda.reduce((sum, t) => sum + t.slots.filter(s => s.date === date).length, 0);
  const bookedSlots = filteredAgenda.reduce((sum, t) => sum + t.slots.filter(s => s.date === date && s.booked).length, 0);
  const freeSlots = totalSlots - bookedSlots;
  const occupancyPct = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  return (
    <div>
      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <button className="btn-sm btn-outline" onClick={() => navigateDate(-1)}>‹</button>
          <button className="btn-sm btn-outline" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Bugün</button>
          <button className="btn-sm btn-outline" onClick={() => navigateDate(1)}>›</button>
          <span className="agenda-date-label">{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="agenda-view-toggle">
          <select className="form-input" style={{ minWidth: 160 }} value={filterTrainer} onChange={(e) => setFilterTrainer(e.target.value)}>
            <option value="all">Tüm Eğitmenler</option>
            {agenda.map(t => <option key={t.trainerId} value={t.trainerId}>{t.trainerName}</option>)}
          </select>
        </div>
      </div>

      {!loading && totalSlots > 0 && (
        <div className="agenda-stats-bar">
          <div className="agenda-stat"><span className="agenda-stat-value">{bookedSlots}</span><span className="agenda-stat-label">Ders</span></div>
          <div className="agenda-stat"><span className="agenda-stat-value">{freeSlots}</span><span className="agenda-stat-label">Müsait</span></div>
          <div className="agenda-stat"><span className="agenda-stat-value">{totalSlots}</span><span className="agenda-stat-label">Toplam</span></div>
          <div className="agenda-stat"><span className="agenda-stat-value" style={{ color: occupancyPct >= 80 ? '#059669' : occupancyPct >= 50 ? '#d97706' : '#64748b' }}>%{occupancyPct}</span><span className="agenda-stat-label">Doluluk</span></div>
          <div className="agenda-legend">
            <span className="agenda-legend-item"><span className="agenda-legend-dot" style={{ background: '#22c55e' }}></span>Müsait</span>
            <span className="agenda-legend-item"><span className="agenda-legend-dot" style={{ background: '#2563eb' }}></span>Dolu</span>
            <span className="agenda-legend-item"><span className="agenda-legend-dot" style={{ background: '#e2e8f0' }}></span>Slot Yok</span>
          </div>
        </div>
      )}

      {loading && <p className="muted">Yükleniyor...</p>}
      {!loading && agenda.length === 0 && <div className="empty-state"><span className="empty-icon">🏋️</span><p>Aktif eğitmen bulunamadı veya slot tanımlı değil.</p></div>}

      {!loading && filteredAgenda.length > 0 && (
        <div className="agenda-grid-wrapper">
          <table className="agenda-table">
            <thead>
              <tr>
                <th className="agenda-th-hour">Saat</th>
                {filteredAgenda.map(t => {
                  const daySlots = t.slots.filter(s => s.date === date);
                  const booked = daySlots.filter(s => s.booked).length;
                  return (
                    <th key={t.trainerId} className="agenda-th-therapist">
                      <div>{t.photoUrl && <img src={t.photoUrl} alt="" className="agenda-avatar" />}</div>
                      <div className="agenda-therapist-name">{t.trainerName}</div>
                      <div className="agenda-therapist-stat">{booked}/{daySlots.length} dolu</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map(h => {
                const nextH = `${String(parseInt(h) + 1).padStart(2, '0')}:00`;
                const now = new Date();
                const isToday = date === now.toISOString().slice(0, 10);
                const isPast = isToday && parseInt(h) < now.getHours();
                return (
                  <tr key={h} className={isPast ? 'agenda-row-past' : ''}>
                    <td className="agenda-td-hour">{h}–{nextH}</td>
                    {filteredAgenda.map(t => {
                      const slot = t.slots.filter(s => s.date === date).find(s => s.startTime === h);
                      if (!slot) return <td key={t.trainerId} className={`agenda-td agenda-td-empty ${isPast ? 'agenda-td-past' : ''}`}><span className="agenda-empty-plus">{isPast ? '—' : '+'}</span></td>;
                      if (slot.booked && slot.reservation) return (
                        <td key={t.trainerId} className={`agenda-td agenda-td-booked ${isPast ? 'agenda-td-past' : ''}`}>
                          <div className="agenda-td-content"><span className="agenda-td-name">{slot.reservation.memberName?.split(' ')[0] || '—'}</span><span className="agenda-td-status">{slot.reservation.status === 'confirmed' ? '✓' : '⏳'}</span></div>
                        </td>
                      );
                      return <td key={t.trainerId} className={`agenda-td agenda-td-free ${isPast ? 'agenda-td-past' : ''}`}><span className="agenda-free-label">{isPast ? '—' : 'Müsait'}</span></td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── PT Reservations Tab ────────────────────────────────────────────────────────

function PtReservationsTab() {
  const [reservations, setReservations] = useState<Array<{ id: string; status: string; startTime: string; endTime: string; memberName: string | null; memberPhone: string | null; trainerName: string | null; sessionType: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<typeof reservations>(`/admin/pt-reservations?status=${statusFilter}`);
      setReservations(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const STATUS_LABELS: Record<string, string> = { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' };

  const filtered = reservations
    .filter(r => !searchTerm || (r.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.trainerName || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'confirmed', 'completed', 'cancelled', 'pending'].map(s => (
          <button key={s} className={`btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'Tümü' : STATUS_LABELS[s]}
          </button>
        ))}
        <input type="text" className="form-input" style={{ minWidth: 140, padding: '4px 10px', fontSize: '0.75rem', height: 28 }} placeholder="Üye veya eğitmen ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading && <p className="muted">Yükleniyor...</p>}
      {!loading && filtered.length === 0 && <div className="empty-state"><span className="empty-icon">📋</span><p>Bu filtrede randevu yok</p></div>}

      {!loading && filtered.length > 0 && (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Üye</th><th>Eğitmen</th><th>Tarih & Saat</th><th>Durum</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.memberName || '—'}</strong>{r.memberPhone && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{r.memberPhone}</div>}</td>
                  <td>{r.trainerName || '—'}</td>
                  <td><div>{new Date(r.startTime).toLocaleDateString('tr-TR')}</div><div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>{new Date(r.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}–{new Date(r.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div></td>
                  <td><span className={`status-badge status-spa-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── PT Packages Tab ────────────────────────────────────────────────────────────

function PtPackagesTab() {
  const [packages, setPackages] = useState<Array<{ id: string; name: string; sessionCount: number; price: string; validityDays: number; active: boolean }>>([]);
  const [sales, setSales] = useState<Array<{ id: string; memberName: string; packageName: string; sessionCount: number; remainingSessions: number; usedSessions: number; price: string; status: string; expiresAt: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'defs' | 'sales'>('defs');

  useEffect(() => {
    Promise.all([
      apiJson<Array<{ id: string; name: string; sessionCount: number; price: string; validityDays: number; sessionType: string; active: boolean }>>('/admin/package-types'),
      apiJson<Array<{ id: string; memberName: string; packageName: string; sessionCount: number; remainingSessions: number; usedSessions: number; price: string; status: string; expiresAt: string; createdAt: string }>>('/admin/spa-package-sales'), // reuse same endpoint, filter client-side
    ]).then(([pkgs, allSales]) => {
      setPackages(pkgs.filter(p => p.sessionType === 'personal_training'));
      // PT sales = packages where packageName includes PT keywords or sessionType matching
      setSales(allSales); // TODO: separate endpoint for PT sales if needed
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button className={`btn-sm ${subTab === 'defs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('defs')}>📦 Paket Tanımları ({packages.length})</button>
        <button className={`btn-sm ${subTab === 'sales' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('sales')}>🧾 Satış Geçmişi</button>
      </div>

      {subTab === 'defs' && (
        packages.length === 0 ? (
          <div className="empty-state"><span className="empty-icon">📦</span><p>PT paketi tanımlı değil. Sidebar → Paketler'den ekleyebilirsiniz.</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {packages.map(p => (
              <div key={p.id} className="service-card">
                <div className="service-card-header">
                  <span className="service-category">🏋️ {p.sessionCount} Seans</span>
                  <span className={`service-status ${p.active ? 'active' : 'inactive'}`}>{p.active ? 'Aktif' : 'Pasif'}</span>
                </div>
                <h3 className="service-name">{p.name}</h3>
                <div className="service-meta">
                  <span>📅 {p.validityDays} gün</span>
                  <span className="service-price">₺{parseFloat(p.price).toLocaleString('tr-TR')}</span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--muted)' }}>Seans/₺{Math.round(parseFloat(p.price) / p.sessionCount).toLocaleString('tr-TR')}</div>
              </div>
            ))}
          </div>
        )
      )}

      {subTab === 'sales' && (
        <div className="empty-state"><span className="empty-icon">🧾</span><p>PT paket satış geçmişi henüz entegre edilmedi.</p></div>
      )}
    </div>
  );
}

// ─── PT Reports Tab ─────────────────────────────────────────────────────────────

function PtReportsTab() {
  const [stats, setStats] = useState<Array<{ trainerId: string; trainerName: string; totalSlots: number; bookedSlots: number; occupancyPct: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const from = new Date(now);
    if (period === 'week') from.setDate(now.getDate() - 7); else from.setDate(now.getDate() - 30);

    apiJson<TrainerAgenda[]>(`/admin/trainers/agenda?from=${from.toISOString().slice(0, 10)}&to=${now.toISOString().slice(0, 10)}`)
      .then(data => {
        const s = data.map(t => {
          const total = t.slots.length;
          const booked = t.slots.filter(sl => sl.booked).length;
          return { trainerId: t.trainerId, trainerName: t.trainerName, totalSlots: total, bookedSlots: booked, occupancyPct: total > 0 ? Math.round((booked / total) * 100) : 0 };
        });
        setStats(s.sort((a, b) => b.occupancyPct - a.occupancyPct));
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [period]);

  if (loading) return <p className="muted">Rapor yükleniyor...</p>;

  const totalSessions = stats.reduce((s, t) => s + t.bookedSlots, 0);
  const totalSlots = stats.reduce((s, t) => s + t.totalSlots, 0);
  const avgOcc = totalSlots > 0 ? Math.round((totalSessions / totalSlots) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="spa-section-title" style={{ margin: 0 }}>📊 Eğitmen Performansı</h3>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className={`btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('week')}>7 Gün</button>
          <button className={`btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('month')}>30 Gün</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Ders</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{totalSessions}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Slot</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{totalSlots}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Ort. Doluluk</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: avgOcc >= 70 ? '#059669' : '#d97706' }}>%{avgOcc}</div></div>
      </div>

      <div className="members-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Eğitmen</th><th>Slot</th><th>Ders</th><th>Doluluk</th><th>Görsel</th></tr></thead>
          <tbody>
            {stats.map(t => (
              <tr key={t.trainerId}>
                <td><strong>{t.trainerName}</strong></td>
                <td>{t.totalSlots}</td>
                <td>{t.bookedSlots}</td>
                <td><span style={{ fontWeight: 700, color: t.occupancyPct >= 70 ? '#059669' : t.occupancyPct >= 40 ? '#d97706' : '#dc2626' }}>%{t.occupancyPct}</span></td>
                <td><div style={{ width: '100%', maxWidth: 120, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${t.occupancyPct}%`, height: '100%', background: t.occupancyPct >= 70 ? '#22c55e' : t.occupancyPct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 4 }}></div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
