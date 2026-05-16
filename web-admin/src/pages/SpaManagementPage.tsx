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

type TabType = 'agenda' | 'appointments' | 'services' | 'therapists' | 'packages' | 'rooms' | 'reports';

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
    { key: 'reports', icon: '📊', label: 'Raporlar' },
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
      {activeTab === 'reports' && <ReportsTab />}
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
  const [filterTherapist, setFilterTherapist] = useState<string>('all');

  // Action modal
  const [selectedAction, setSelectedAction] = useState<{ slot: AgendaSlot | null; therapist: TherapistAgenda; hour: string; type: 'available' | 'booked' | 'empty' } | null>(null);
  const [actionMode, setActionMode] = useState<'menu' | 'book' | 'addSlot' | 'bulkSlot' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [allMembers, setAllMembers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string | null }>>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [bulkStartHour, setBulkStartHour] = useState(11);
  const [bulkEndHour, setBulkEndHour] = useState(22);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, members] = await Promise.all([
        apiJson<TherapistAgenda[]>(`/admin/therapists/agenda?from=${date}&to=${date}`),
        apiJson<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string | null }>>('/admin/members?status=active'),
      ]);
      setAgenda(data);
      setAllMembers(members);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  function navigateDate(offset: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().slice(0, 10));
  }

  function openSlotMenu(slot: AgendaSlot | null, therapist: TherapistAgenda, hour: string) {
    const type = slot ? (slot.booked ? 'booked' : 'available') : 'empty';
    setSelectedAction({ slot, therapist, hour, type });
    setActionMode('menu');
    setSelectedMember(null);
    setMemberSearch('');
  }

  function closeModal() { setSelectedAction(null); setActionMode(null); setSelectedMember(null); setMemberSearch(''); setSelectedServiceId(''); }

  function openBulkSlotMenu(therapist: TherapistAgenda) {
    setSelectedAction({ slot: null, therapist, hour: '11:00', type: 'empty' });
    setActionMode('bulkSlot');
    setBulkStartHour(11);
    setBulkEndHour(22);
  }

  async function handleClearDay(therapist: TherapistAgenda) {
    const daySlots = therapist.slots.filter(s => s.date === date);
    const bookedCount = daySlots.filter(s => s.booked).length;
    const msg = bookedCount > 0
      ? `${therapist.therapistName} — ${date} tüm slotlar silinecek (${bookedCount} randevu var!). Emin misiniz?`
      : `${therapist.therapistName} — ${date} tüm slotlar silinecek. Emin misiniz?`;
    if (!confirm(msg)) return;
    setActionLoading(true);
    try {
      await apiJson(`/admin/therapists/${therapist.therapistId}/calendar-day?date=${date}`, { method: 'DELETE' });
      void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setActionLoading(false); }
  }

  async function handleBulkAddSlots() {
    if (!selectedAction) return;
    setActionLoading(true);
    try {
      // Her saat için ayrı slot oluştur (08:00-09:00, 09:00-10:00, ...)
      const promises = [];
      for (let h = bulkStartHour; h < bulkEndHour; h++) {
        const startTime = `${String(h).padStart(2, '0')}:00`;
        const endTime = `${String(h + 1).padStart(2, '0')}:00`;
        promises.push(
          apiJson(`/admin/therapists/${selectedAction.therapist.therapistId}/calendar`, {
            method: 'POST',
            body: JSON.stringify({ date, startTime, endTime }),
          }).catch(() => null)
        );
      }
      await Promise.all(promises);
      closeModal(); void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Slot eklenemedi'); }
    finally { setActionLoading(false); }
  }

  async function handleDeleteSlot() {
    if (!selectedAction?.slot) return;
    if (!confirm(`${selectedAction.slot.startTime}–${selectedAction.slot.endTime} slotu silinecek?`)) return;
    setActionLoading(true);
    try {
      await apiJson(`/admin/therapists/${selectedAction.therapist.therapistId}/calendar/${selectedAction.slot.id}`, { method: 'DELETE' });
      closeModal(); void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setActionLoading(false); }
  }

  async function handleAddSlot() {
    if (!selectedAction) return;
    setActionLoading(true);
    const startTime = selectedAction.hour;
    const endH = String(parseInt(startTime) + 1).padStart(2, '0');
    const endTime = `${endH}:00`;
    try {
      await apiJson(`/admin/therapists/${selectedAction.therapist.therapistId}/calendar`, {
        method: 'POST',
        body: JSON.stringify({ date, startTime, endTime }),
      });
      closeModal(); void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Slot eklenemedi'); }
    finally { setActionLoading(false); }
  }

  async function handleCancelReservation() {
    if (!selectedAction?.slot?.reservation) return;
    if (!confirm('Randevu iptal edilecek. Emin misiniz?')) return;
    setActionLoading(true);
    try {
      await apiJson(`/admin/reservations/${selectedAction.slot.reservation.id}/cancel`, { method: 'POST' });
      closeModal(); void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setActionLoading(false); }
  }

  async function handleCompleteReservation() {
    if (!selectedAction?.slot?.reservation) return;
    setActionLoading(true);
    try {
      await apiJson(`/admin/reservations/${selectedAction.slot.reservation.id}/complete`, { method: 'POST' });
      closeModal(); void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setActionLoading(false); }
  }

  async function handleBookSlot() {
    if (!selectedAction || !selectedMember) return;
    setActionLoading(true);
    try {
      const startTime = selectedAction.slot?.startTime || selectedAction.hour;
      const endH = String(parseInt(startTime) + 1).padStart(2, '0');
      const endTime = selectedAction.slot?.endTime || `${endH}:00`;
      await apiJson('/admin/therapists/reservations/create', {
        method: 'POST',
        body: JSON.stringify({ therapistId: selectedAction.therapist.therapistId, userId: selectedMember.id, date, startTime, endTime, serviceId: selectedServiceId || undefined }),
      });
      closeModal(); void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Randevu oluşturulamadı'); }
    finally { setActionLoading(false); }
  }

  // Grid config - fully dynamic: grid hours adapt to actual slot data
  const filteredAgenda = filterTherapist === 'all' ? agenda : agenda.filter(t => t.therapistId === filterTherapist);
  const allSlotTimes = filteredAgenda.flatMap(t => t.slots.filter(s => s.date === date).map(s => parseInt(s.startTime)));
  const minHour = allSlotTimes.length > 0 ? Math.min(...allSlotTimes) : 9;
  const maxHour = allSlotTimes.length > 0 ? Math.max(...allSlotTimes) + 1 : 22;
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => `${String(i + minHour).padStart(2, '0')}:00`);

  // Stats for today
  const totalSlots = filteredAgenda.reduce((sum, t) => sum + t.slots.filter(s => s.date === date).length, 0);
  const bookedSlots = filteredAgenda.reduce((sum, t) => sum + t.slots.filter(s => s.date === date && s.booked).length, 0);
  const freeSlots = totalSlots - bookedSlots;
  const occupancyPct = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  // Filtered member list for booking modal
  const filteredMembers = memberSearch.length > 0
    ? allMembers.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 10)
    : allMembers.slice(0, 10);

  // Spa services for booking
  const [spaServices, setSpaServices] = useState<Array<{ id: string; name: string; category: string; durationMinutes: number }>>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  useEffect(() => {
    apiJson<Array<{ id: string; name: string; category: string; durationMinutes: number }>>('/spa/admin/services')
      .then(setSpaServices).catch(() => {});
  }, []);

  return (
    <div>
      {/* Toolbar */}
      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <button className="btn-sm btn-outline" onClick={() => navigateDate(-1)}>‹</button>
          <button className="btn-sm btn-outline" onClick={() => setDate(new Date().toISOString().slice(0, 10))}>Bugün</button>
          <button className="btn-sm btn-outline" onClick={() => navigateDate(1)}>›</button>
          <span className="agenda-date-label">
            {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="agenda-view-toggle">
          <select className="form-input" style={{ minWidth: 160 }} value={filterTherapist} onChange={(e) => setFilterTherapist(e.target.value)}>
            <option value="all">Tüm Masözler</option>
            {agenda.map(t => <option key={t.therapistId} value={t.therapistId}>{t.therapistName}</option>)}
          </select>
        </div>
      </div>

      {/* Stats Bar */}
      {!loading && totalSlots > 0 && (
        <div className="agenda-stats-bar">
          <div className="agenda-stat"><span className="agenda-stat-value">{bookedSlots}</span><span className="agenda-stat-label">Randevu</span></div>
          <div className="agenda-stat"><span className="agenda-stat-value">{freeSlots}</span><span className="agenda-stat-label">Müsait</span></div>
          <div className="agenda-stat"><span className="agenda-stat-value">{totalSlots}</span><span className="agenda-stat-label">Toplam Slot</span></div>
          <div className="agenda-stat"><span className="agenda-stat-value" style={{ color: occupancyPct >= 80 ? '#059669' : occupancyPct >= 50 ? '#d97706' : '#64748b' }}>%{occupancyPct}</span><span className="agenda-stat-label">Doluluk</span></div>
          <div className="agenda-legend">
            <span className="agenda-legend-item"><span className="agenda-legend-dot" style={{ background: '#22c55e' }}></span>Müsait</span>
            <span className="agenda-legend-item"><span className="agenda-legend-dot" style={{ background: '#2563eb' }}></span>Dolu</span>
            <span className="agenda-legend-item"><span className="agenda-legend-dot" style={{ background: '#e2e8f0' }}></span>Slot Yok</span>
          </div>
        </div>
      )}

      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && agenda.length === 0 && (
        <div className="empty-state"><span className="empty-icon">💆</span><p>Aktif masöz bulunamadı veya slot tanımlı değil.</p></div>
      )}

      {/* TRANSPOSED Grid: Rows=Hours, Columns=Therapists */}
      {!loading && filteredAgenda.length > 0 && (
        <div className="agenda-grid-wrapper">
          <table className="agenda-table">
            <thead>
              <tr>
                <th className="agenda-th-hour">Saat</th>
                {filteredAgenda.map((t) => {
                  const daySlots = t.slots.filter(s => s.date === date);
                  const booked = daySlots.filter(s => s.booked).length;
                  return (
                    <th key={t.therapistId} className="agenda-th-therapist">
                      <div style={{ cursor: 'pointer' }} onClick={() => openBulkSlotMenu(t)} title="Tıkla: Çalışma saati ekle">
                        {t.photoUrl && <img src={t.photoUrl} alt="" className="agenda-avatar" />}
                        <div className="agenda-therapist-name">{t.therapistName}</div>
                        <div className="agenda-therapist-stat">{booked}/{daySlots.length} dolu</div>
                      </div>
                      {daySlots.length > 0 && (
                        <button className="agenda-clear-btn" onClick={(e) => { e.stopPropagation(); void handleClearDay(t); }} title="Tüm günü kapat">✕ Günü Kapat</button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => {
                const nextH = `${String(parseInt(h) + 1).padStart(2, '0')}:00`;
                return (
                  <tr key={h}>
                    <td className="agenda-td-hour">{h}–{nextH}</td>
                    {filteredAgenda.map((t) => {
                      const daySlots = t.slots.filter(s => s.date === date);
                      const slot = daySlots.find(s => s.startTime === h);
                      if (!slot) {
                        return (
                          <td key={t.therapistId} className="agenda-td agenda-td-empty" onClick={() => openSlotMenu(null, t, h)} title="Slot yok — Tıkla: Ekle">
                            <span className="agenda-empty-plus">+</span>
                          </td>
                        );
                      }
                      if (slot.booked && slot.reservation) {
                        return (
                          <td key={t.therapistId} className="agenda-td agenda-td-booked" onClick={() => openSlotMenu(slot, t, h)} title={`${slot.reservation.memberName || 'Üye'} — Tıkla: İşlemler`}>
                            <div className="agenda-td-content">
                              <span className="agenda-td-name">{slot.reservation.memberName || '—'}</span>
                              <span className="agenda-td-status">{slot.reservation.status === 'confirmed' ? '✓' : '⏳'}</span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={t.therapistId} className="agenda-td agenda-td-free" onClick={() => openSlotMenu(slot, t, h)} title="Müsait — Tıkla: Randevu/Sil">
                          <span className="agenda-free-label">Müsait</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Action Modal ═══ */}
      {selectedAction && actionMode && (
        <div className="agenda-modal-overlay" onClick={closeModal}>
          <div className="agenda-modal" onClick={(e) => e.stopPropagation()}>
            {/* Empty slot menu */}
            {actionMode === 'menu' && selectedAction.type === 'empty' && (
              <>
                <div className="agenda-modal-header">
                  <h3>➕ Boş Slot</h3>
                  <button className="agenda-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="agenda-modal-info">
                  <span>💆 {selectedAction.therapist.therapistName}</span>
                  <span>🕐 {selectedAction.hour}–{String(parseInt(selectedAction.hour) + 1).padStart(2, '0')}:00</span>
                </div>
                <div className="agenda-modal-actions">
                  <button className="agenda-action-btn agenda-action-book" onClick={() => void handleAddSlot()} disabled={actionLoading}>
                    {actionLoading ? '⏳...' : '➕ Slot Ekle (Müsait Yap)'}
                  </button>
                </div>
              </>
            )}
            {/* Available slot menu */}
            {actionMode === 'menu' && selectedAction.type === 'available' && (
              <>
                <div className="agenda-modal-header">
                  <h3>🟢 Müsait Slot</h3>
                  <button className="agenda-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="agenda-modal-info">
                  <span>💆 {selectedAction.therapist.therapistName}</span>
                  <span>🕐 {selectedAction.slot?.startTime}–{selectedAction.slot?.endTime}</span>
                </div>
                <div className="agenda-modal-actions">
                  <button className="agenda-action-btn agenda-action-book" onClick={() => setActionMode('book')}>📅 Randevu Oluştur</button>
                  <button className="agenda-action-btn agenda-action-cancel" onClick={() => void handleDeleteSlot()} disabled={actionLoading}>🚫 Slotu Sil</button>
                </div>
              </>
            )}
            {/* Booked slot menu */}
            {actionMode === 'menu' && selectedAction.type === 'booked' && (
              <>
                <div className="agenda-modal-header">
                  <h3>🔵 Randevu</h3>
                  <button className="agenda-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="agenda-modal-info">
                  <span>👤 {selectedAction.slot?.reservation?.memberName || '—'}</span>
                  <span>💆 {selectedAction.therapist.therapistName}</span>
                  <span>🕐 {selectedAction.slot?.startTime}–{selectedAction.slot?.endTime}</span>
                  <span>📌 {selectedAction.slot?.reservation?.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}</span>
                </div>
                <div className="agenda-modal-actions">
                  <button className="agenda-action-btn agenda-action-complete" onClick={() => void handleCompleteReservation()} disabled={actionLoading}>✅ Tamamlandı</button>
                  <button className="agenda-action-btn agenda-action-cancel" onClick={() => void handleCancelReservation()} disabled={actionLoading}>❌ İptal Et</button>
                  <button className="agenda-action-btn agenda-action-book" onClick={() => { if (selectedAction?.slot?.reservation) { void apiJson(`/admin/reservations/${selectedAction.slot.reservation.id}/remind`, { method: 'POST' }).then(() => alert('✅ Hatırlatma gönderildi')).catch(() => alert('Gönderilemedi')); } }} disabled={actionLoading}>📱 SMS Hatırlatma</button>
                </div>
              </>
            )}
            {/* Book mode with member list */}
            {actionMode === 'book' && (
              <>
                <div className="agenda-modal-header">
                  <h3>📅 Randevu Oluştur</h3>
                  <button className="agenda-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="agenda-modal-info">
                  <span>💆 {selectedAction.therapist.therapistName}</span>
                  <span>🕐 {selectedAction.slot?.startTime || selectedAction.hour}–{selectedAction.slot?.endTime || `${String(parseInt(selectedAction.hour) + 1).padStart(2, '0')}:00`}</span>
                </div>
                <div className="agenda-modal-form">
                  <label className="form-label">Hizmet Seç</label>
                  <select className="form-input" value={selectedServiceId} onChange={(e) => setSelectedServiceId(e.target.value)}>
                    <option value="">— Hizmet seçin (opsiyonel) —</option>
                    {spaServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} dk)</option>)}
                  </select>
                  <label className="form-label" style={{ marginTop: '0.5rem' }}>Üye Seç veya Ara</label>
                  <input type="text" className="form-input" placeholder="İsim veya e-posta ile filtrele..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
                  {selectedMember && (
                    <div className="agenda-selected-member">
                      ✅ {selectedMember.firstName} {selectedMember.lastName}
                      <button className="btn-sm btn-outline" style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setSelectedMember(null)}>Değiştir</button>
                    </div>
                  )}
                  {!selectedMember && (
                    <div className="agenda-member-list">
                      {filteredMembers.map((m) => (
                        <div key={m.id} className="agenda-member-item" onClick={() => setSelectedMember(m)}>
                          <strong>{m.firstName} {m.lastName}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</span>
                        </div>
                      ))}
                      {filteredMembers.length === 0 && <p className="muted" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Üye bulunamadı</p>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button className="btn-sm btn-primary" disabled={!selectedMember || actionLoading} onClick={() => void handleBookSlot()}>
                      {actionLoading ? '⏳...' : '✓ Oluştur'}
                    </button>
                    <button className="btn-sm btn-outline" onClick={() => setActionMode('menu')}>Geri</button>
                  </div>
                </div>
              </>
            )}
            {/* Bulk Slot Mode */}
            {actionMode === 'bulkSlot' && selectedAction && (
              <>
                <div className="agenda-modal-header">
                  <h3>🕐 Çalışma Saati Ekle</h3>
                  <button className="agenda-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="agenda-modal-info">
                  <span>💆 {selectedAction.therapist.therapistName}</span>
                  <span>📅 {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </div>
                <div className="agenda-modal-form">
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>
                    Seçilen saat aralığında her saat için müsait slot oluşturulur.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Başlangıç</span>
                      <select value={bulkStartHour} onChange={(e) => setBulkStartHour(Number(e.target.value))} className="form-input">
                        {Array.from({ length: 16 }, (_, i) => i + 6).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Bitiş</span>
                      <select value={bulkEndHour} onChange={(e) => setBulkEndHour(Number(e.target.value))} className="form-input">
                        {Array.from({ length: 16 }, (_, i) => i + 7).map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                      </select>
                    </label>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text)', margin: '0.5rem 0 0', fontWeight: 600 }}>
                    {bulkEndHour - bulkStartHour} slot oluşturulacak ({String(bulkStartHour).padStart(2, '0')}:00 – {String(bulkEndHour).padStart(2, '0')}:00)
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn-sm btn-primary" disabled={actionLoading || bulkEndHour <= bulkStartHour} onClick={() => void handleBulkAddSlots()}>
                      {actionLoading ? '⏳...' : `✓ ${bulkEndHour - bulkStartHour} Slot Oluştur`}
                    </button>
                    <button className="btn-sm btn-outline" onClick={closeModal}>İptal</button>
                  </div>
                </div>
              </>
            )}
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
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState(1);
  const [formPrice, setFormPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(11);
  const [endHour, setEndHour] = useState(22);
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

  function resetForm() { setEditId(null); setFormName(''); setFormCapacity(1); setFormPrice(''); setShowForm(false); }

  function startEdit(r: RoomRow) { setEditId(r.id); setFormName(r.name); setFormCapacity(r.capacity); setFormPrice(r.price); setShowForm(true); }

  async function handleSaveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPrice) return;
    setSaving(true);
    try {
      if (editId) {
        await apiJson(`/resource-booking/admin/resources/${editId}`, {
          method: 'POST',
          body: JSON.stringify({ name: formName.trim(), capacity: formCapacity, price: parseFloat(formPrice) }),
        });
      } else {
        await apiJson('/resource-booking/admin/resources', {
          method: 'POST',
          body: JSON.stringify({ name: formName.trim(), resourceType: 'massage_room', capacity: formCapacity, durationMinutes: 60, price: parseFloat(formPrice), description: formCapacity >= 2 ? 'Çift kişilik masaj odası' : 'Tek kişilik masaj odası' }),
        });
      }
      resetForm();
      await loadRooms();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setSaving(false); }
  }

  async function handleDeleteRoom(id: string, name: string) {
    if (!confirm(`"${name}" odası silinecek (deaktif edilecek). Emin misiniz?`)) return;
    try {
      await apiJson(`/resource-booking/admin/resources/${id}`, {
        method: 'POST',
        body: JSON.stringify({ active: false }),
      });
      await loadRooms();
    } catch (err) { alert(err instanceof Error ? err.message : 'Silinemedi'); }
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
            <button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Yeni Oda</button>
          </div>

          {showForm && (
            <form onSubmit={(e) => void handleSaveRoom(e)} className="spa-form-panel" style={{ display: 'grid', gap: '0.75rem' }}>
              <h4>{editId ? '✏️ Oda Düzenle' : '+ Yeni Masaj Odası'}</h4>
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
                <button type="submit" className="btn-sm btn-primary" disabled={saving}>{saving ? '⏳...' : editId ? '✓ Güncelle' : '✓ Oda Oluştur'}</button>
                <button type="button" className="btn-sm btn-outline" onClick={resetForm}>İptal</button>
              </div>
            </form>
          )}

          {rooms.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">🏠</span><p>Henüz masaj odası tanımlı değil</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {rooms.map((r) => (
                <div key={r.id} className="spa-pkg-card">
                  <div style={{ flex: 1 }}>
                    <strong>{r.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{r.capacity >= 2 ? '👫 Çift kişilik' : '🧖 Tek kişilik'} · {r.durationMinutes} dk</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="spa-pkg-price">{r.price}₺</span>
                    <button className="btn-sm btn-outline" onClick={() => startEdit(r)}>✏️</button>
                    <button className="btn-sm btn-danger" onClick={() => void handleDeleteRoom(r.id, r.name)}>🗑</button>
                  </div>
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

// ─── Reports Tab ────────────────────────────────────────────────────────────────

function ReportsTab() {
  const [therapistStats, setTherapistStats] = useState<Array<{
    therapistId: string;
    therapistName: string;
    totalSlots: number;
    bookedSlots: number;
    completedSessions: number;
    occupancyPct: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const from = new Date(now);
    if (period === 'week') from.setDate(now.getDate() - 7);
    else from.setDate(now.getDate() - 30);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = now.toISOString().slice(0, 10);

    apiJson<Array<{ therapistId: string; therapistName: string; photoUrl: string | null; slots: Array<{ booked: boolean }> }>>(`/admin/therapists/agenda?from=${fromStr}&to=${toStr}`)
      .then((data) => {
        const stats = data.map(t => {
          const total = t.slots.length;
          const booked = t.slots.filter(s => s.booked).length;
          return {
            therapistId: t.therapistId,
            therapistName: t.therapistName,
            totalSlots: total,
            bookedSlots: booked,
            completedSessions: booked,
            occupancyPct: total > 0 ? Math.round((booked / total) * 100) : 0,
          };
        });
        setTherapistStats(stats.sort((a, b) => b.occupancyPct - a.occupancyPct));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  if (loading) return <p className="muted">Rapor yükleniyor...</p>;

  const totalSessions = therapistStats.reduce((s, t) => s + t.bookedSlots, 0);
  const totalSlots = therapistStats.reduce((s, t) => s + t.totalSlots, 0);
  const avgOccupancy = totalSlots > 0 ? Math.round((totalSessions / totalSlots) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="spa-section-title" style={{ margin: 0 }}>📊 Performans Raporu</h3>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className={`btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('week')}>Son 7 Gün</button>
          <button className={`btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('month')}>Son 30 Gün</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Seans</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb' }}>{totalSessions}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Slot</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>{totalSlots}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Ortalama Doluluk</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: avgOccupancy >= 70 ? '#059669' : '#d97706' }}>%{avgOccupancy}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Aktif Masöz</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#8b5cf6' }}>{therapistStats.length}</div>
        </div>
      </div>

      {/* Therapist Performance Table */}
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Masöz Performansı</h4>
      <div className="members-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Masöz</th>
              <th>Toplam Slot</th>
              <th>Dolu</th>
              <th>Doluluk</th>
              <th>Görsel</th>
            </tr>
          </thead>
          <tbody>
            {therapistStats.map((t) => (
              <tr key={t.therapistId}>
                <td><strong>{t.therapistName}</strong></td>
                <td>{t.totalSlots}</td>
                <td>{t.bookedSlots}</td>
                <td>
                  <span style={{ fontWeight: 700, color: t.occupancyPct >= 70 ? '#059669' : t.occupancyPct >= 40 ? '#d97706' : '#dc2626' }}>
                    %{t.occupancyPct}
                  </span>
                </td>
                <td>
                  <div style={{ width: '100%', maxWidth: 120, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${t.occupancyPct}%`, height: '100%', background: t.occupancyPct >= 70 ? '#22c55e' : t.occupancyPct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 4 }}></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
