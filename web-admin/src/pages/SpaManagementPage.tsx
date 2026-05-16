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
  sessionCost: number;
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
    { key: 'appointments', icon: '📋', label: 'Geçmiş' },
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
  const [actionMode, setActionMode] = useState<'menu' | 'book' | 'addSlot' | 'bulkSlot' | 'reschedule' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [allMembers, setAllMembers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string | null; massageSessions: number; ptSessions: number }>>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [bulkStartHour, setBulkStartHour] = useState(11);
  const [bulkEndHour, setBulkEndHour] = useState(22);

  // Drag & Drop
  const [dragData, setDragData] = useState<{ reservationId: string; fromTherapistId: string; fromHour: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ therapistId: string; hour: string } | null>(null);

  // Reschedule form
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleHour, setRescheduleHour] = useState('11');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, members] = await Promise.all([
        apiJson<TherapistAgenda[]>(`/admin/therapists/agenda?from=${date}&to=${date}`),
        apiJson<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string | null; massageSessions: number; ptSessions: number }>>('/admin/members?status=active'),
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

  // ─── Drag & Drop Handlers ────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, reservationId: string, therapistId: string, hour: string) {
    setDragData({ reservationId, fromTherapistId: therapistId, fromHour: hour });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', reservationId);
  }

  function handleDragOver(e: React.DragEvent, therapistId: string, hour: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ therapistId, hour });
  }

  function handleDragLeave() {
    setDropTarget(null);
  }

  async function handleDrop(e: React.DragEvent, targetTherapistId: string, targetHour: string) {
    e.preventDefault();
    setDropTarget(null);
    if (!dragData) return;

    const { reservationId, fromTherapistId, fromHour } = dragData;
    setDragData(null);

    // Aynı yere bırakıldıysa işlem yapma
    if (fromTherapistId === targetTherapistId && fromHour === targetHour) return;

    const endH = String(parseInt(targetHour) + 1).padStart(2, '0');
    const newEndTime = `${endH}:00`;

    try {
      await apiJson(`/admin/therapists/reservations/${reservationId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ newDate: date, newStartTime: targetHour, newEndTime, therapistId: targetTherapistId }),
      });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Taşıma başarısız');
    }
  }

  function handleDragEnd() {
    setDragData(null);
    setDropTarget(null);
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

  // Filtered member list for booking modal (package holders first)
  const filteredMembers = (() => {
    let list = allMembers;
    if (memberSearch.length > 0) {
      list = list.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(memberSearch.toLowerCase()));
    }
    // Sort: massage sessions > 0 first
    return [...list].sort((a, b) => b.massageSessions - a.massageSessions).slice(0, 12);
  })();

  // Spa services for booking
  const [spaServices, setSpaServices] = useState<Array<{ id: string; name: string; category: string; durationMinutes: number; sessionCost: number }>>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  useEffect(() => {
    apiJson<Array<{ id: string; name: string; category: string; durationMinutes: number; sessionCost: number }>>('/spa/admin/services')
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
                const now = new Date();
                const isToday = date === now.toISOString().slice(0, 10);
                const isPastHour = isToday && parseInt(h) < now.getHours();
                return (
                  <tr key={h} className={isPastHour ? 'agenda-row-past' : ''}>
                    <td className="agenda-td-hour">{h}–{nextH}</td>
                    {filteredAgenda.map((t) => {
                      const daySlots = t.slots.filter(s => s.date === date);
                      const slot = daySlots.find(s => s.startTime === h);
                      if (!slot) {
                        return (
                          <td key={t.therapistId} className={`agenda-td agenda-td-empty ${isPastHour ? 'agenda-td-past' : ''} ${dropTarget?.therapistId === t.therapistId && dropTarget?.hour === h ? 'agenda-td-drop-target' : ''}`} onClick={isPastHour ? undefined : () => openSlotMenu(null, t, h)} onDragOver={isPastHour ? undefined : (e) => handleDragOver(e, t.therapistId, h)} onDragLeave={handleDragLeave} onDrop={isPastHour ? undefined : (e) => void handleDrop(e, t.therapistId, h)}>
                            <span className="agenda-empty-plus">{isPastHour ? '—' : dropTarget?.therapistId === t.therapistId && dropTarget?.hour === h ? '⬇' : '+'}</span>
                          </td>
                        );
                      }
                      if (slot.booked && slot.reservation) {
                        return (
                          <td key={t.therapistId} className={`agenda-td agenda-td-booked ${isPastHour ? 'agenda-td-past' : 'agenda-td-draggable'}`} draggable={!isPastHour} onDragStart={isPastHour ? undefined : (e) => handleDragStart(e, slot.reservation!.id, t.therapistId, h)} onDragEnd={handleDragEnd} onClick={() => openSlotMenu(slot, t, h)} title={`${slot.reservation.memberName || 'Üye'}${isPastHour ? ' (geçmiş)' : ''}`}>
                            <div className="agenda-td-content">
                              <span className="agenda-td-name">{slot.reservation.memberName || '—'}</span>
                              <span className="agenda-td-status">{isPastHour ? '✓' : slot.reservation.status === 'confirmed' ? '✓' : '⏳'}</span>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={t.therapistId} className={`agenda-td agenda-td-free ${isPastHour ? 'agenda-td-past' : ''} ${dropTarget?.therapistId === t.therapistId && dropTarget?.hour === h ? 'agenda-td-drop-target' : ''}`} onClick={isPastHour ? undefined : () => openSlotMenu(slot, t, h)} onDragOver={isPastHour ? undefined : (e) => handleDragOver(e, t.therapistId, h)} onDragLeave={handleDragLeave} onDrop={isPastHour ? undefined : (e) => void handleDrop(e, t.therapistId, h)}>
                          <span className="agenda-free-label">{isPastHour ? '—' : dropTarget?.therapistId === t.therapistId && dropTarget?.hour === h ? '⬇ Bırak' : 'Müsait'}</span>
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
                  <button className="agenda-action-btn agenda-action-book" onClick={() => { setRescheduleDate(date); setRescheduleHour(selectedAction?.slot?.startTime?.slice(0, 2) || '11'); setActionMode('reschedule'); }} disabled={actionLoading}>📅 İleri Tarihe Al</button>
                  <button className="agenda-action-btn agenda-action-book" onClick={() => { if (selectedAction?.slot?.reservation) { void apiJson(`/admin/reservations/${selectedAction.slot.reservation.id}/remind`, { method: 'POST' }).then(() => alert('✅ Hatırlatma gönderildi (SMS + Mail + Push)')).catch(() => alert('Gönderilemedi')); } }} disabled={actionLoading}>📱 SMS & Mail & Push Hatırlatma</button>
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
                    {spaServices.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} dk · {s.sessionCost || 1} kredi)</option>)}
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div>
                              <strong>{m.firstName} {m.lastName}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</span>
                            </div>
                            {m.massageSessions > 0 ? (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#dcfce7', color: '#166534' }}>💆 {m.massageSessions} seans</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#fef3c7', color: '#92400e' }}>⚠️ Paket yok</span>
                            )}
                          </div>
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
            {/* Reschedule Mode */}
            {actionMode === 'reschedule' && selectedAction?.slot?.reservation && (
              <>
                <div className="agenda-modal-header">
                  <h3>📅 İleri Tarihe Al</h3>
                  <button className="agenda-modal-close" onClick={closeModal}>✕</button>
                </div>
                <div className="agenda-modal-info">
                  <span>👤 {selectedAction.slot.reservation.memberName || '—'}</span>
                  <span>💆 {selectedAction.therapist.therapistName}</span>
                  <span>🕐 Mevcut: {selectedAction.slot.startTime}–{selectedAction.slot.endTime}</span>
                </div>
                <div className="agenda-modal-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Yeni Tarih</span>
                      <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="form-input" min={new Date().toISOString().slice(0, 10)} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Yeni Saat</span>
                      <select value={rescheduleHour} onChange={(e) => setRescheduleHour(e.target.value)} className="form-input">
                        {Array.from({ length: 16 }, (_, i) => i + 6).map(h => <option key={h} value={String(h).padStart(2, '0')}>{String(h).padStart(2, '0')}:00–{String(h + 1).padStart(2, '0')}:00</option>)}
                      </select>
                    </label>
                  </div>
                  <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--surface)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted)' }}>
                    ℹ️ Üyeye otomatik bildirim gönderilecektir (SMS + Push).
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn-sm btn-primary" disabled={actionLoading || !rescheduleDate} onClick={() => {
                      setActionLoading(true);
                      const newStartTime = `${rescheduleHour}:00`;
                      const endH = String(parseInt(rescheduleHour) + 1).padStart(2, '0');
                      apiJson(`/admin/therapists/reservations/${selectedAction!.slot!.reservation!.id}/reschedule`, {
                        method: 'POST',
                        body: JSON.stringify({ newDate: rescheduleDate, newStartTime, newEndTime: `${endH}:00`, therapistId: selectedAction!.therapist.therapistId }),
                      }).then(() => { closeModal(); void load(); }).catch((err: unknown) => alert(err instanceof Error ? err.message : 'Taşıma başarısız')).finally(() => setActionLoading(false));
                    }}>
                      {actionLoading ? '⏳...' : '✓ Tarihi Güncelle'}
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
  const [reservations, setReservations] = useState<Array<{ id: string; status: string; startTime: string; endTime: string; memberName: string | null; memberEmail: string | null; memberPhone: string | null; therapistName: string | null; serviceName: string | null; serviceDuration: number | null; sessionCost: number; sessionsBefore: number | null; sessionsAfter: number | null; remainingSessions: number | null; sessionType: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<typeof reservations>(`/admin/spa-reservations?status=${statusFilter}`);
      setReservations(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const STATUS_LABELS: Record<string, string> = { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="booking-filters">
          {['confirmed', 'completed', 'cancelled', 'pending'].map((s) => (
            <button key={s} className={`btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(s)}>
              {STATUS_LABELS[s]} 
            </button>
          ))}
        </div>
        <input type="text" className="form-input" style={{ minWidth: 180 }} placeholder="Üye veya masöz ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <input type="date" className="form-input" style={{ width: 140 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Başlangıç tarihi" />
        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>–</span>
        <input type="date" className="form-input" style={{ width: 140 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Bitiş tarihi" />
        {(searchTerm || dateFrom || dateTo) && (
          <button className="btn-sm btn-outline" onClick={() => { setSearchTerm(''); setDateFrom(''); setDateTo(''); }}>✕ Temizle</button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && reservations.length === 0 && (
        <div className="empty-state"><span className="empty-icon">📋</span><p>Bu filtrede randevu yok</p></div>
      )}

      {!loading && reservations.length > 0 && (() => {
        const filtered = reservations.filter(r => {
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            const match = (r.memberName || '').toLowerCase().includes(q) || (r.therapistName || '').toLowerCase().includes(q) || (r.serviceName || '').toLowerCase().includes(q);
            if (!match) return false;
          }
          if (dateFrom && new Date(r.startTime) < new Date(dateFrom + 'T00:00:00')) return false;
          if (dateTo && new Date(r.startTime) > new Date(dateTo + 'T23:59:59')) return false;
          return true;
        });
        if (filtered.length === 0) return <div className="empty-state"><span className="empty-icon">🔍</span><p>Aramanızla eşleşen randevu yok</p></div>;
        return (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Üye</th>
                <th>Masöz</th>
                <th>Hizmet</th>
                <th>Tarih & Saat</th>
                <th>Öncesi</th>
                <th>Kredi</th>
                <th>Sonrası</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.memberName || '—'}</strong>
                    {r.memberPhone && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{r.memberPhone}</div>}
                  </td>
                  <td>{r.therapistName || '—'}</td>
                  <td>
                    {r.serviceName ? (
                      <span>{r.serviceName} <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>({r.serviceDuration} dk)</span></span>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td>
                    <div>{new Date(r.startTime).toLocaleDateString('tr-TR')}</div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>{new Date(r.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}–{new Date(r.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td><span style={{ fontWeight: 700 }}>{r.sessionsBefore ?? '—'}</span></td>
                  <td><span style={{ fontWeight: 700, color: '#dc2626' }}>-{r.sessionCost}</span></td>
                  <td><span style={{ fontWeight: 700, color: r.sessionsAfter !== null ? (r.sessionsAfter > 2 ? '#059669' : r.sessionsAfter > 0 ? '#d97706' : '#dc2626') : 'var(--muted)' }}>{r.sessionsAfter ?? '—'}</span></td>
                  <td><span className={`status-badge status-spa-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
      })()}
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
  const [sessionCost, setSessionCost] = useState(1);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try { setServices(await apiJson<SpaServiceRow[]>('/spa/admin/services')); }
    catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadServices(); }); }, [loadServices]);

  function resetForm() { setEditId(null); setName(''); setDescription(''); setCategory('relax'); setDuration(60); setPrice(''); setSessionCost(1); setActive(true); setShowForm(false); }

  function startEdit(s: SpaServiceRow) { setEditId(s.id); setName(s.name); setDescription(s.description || ''); setCategory(s.category); setDuration(s.durationMinutes); setPrice(String(s.price)); setSessionCost(s.sessionCost || 1); setActive(s.active); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, category, durationMinutes: duration, price: parseFloat(price), sessionCost, active };
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Süre (dk) *</span>
              <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={15} className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Fiyat (₺) *</span>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="2000" required className="form-input" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Seans Kredisi *</span>
              <input type="number" value={sessionCost} onChange={(e) => setSessionCost(Number(e.target.value))} min={1} className="form-input" title="Bu hizmet paketten kaç seans düşer" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span className="form-label">Durum</span>
              <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')} className="form-input">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </label>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.25rem 0 0' }}>
            ℹ️ {duration} dk = {Math.ceil(duration / 60)} slot kapatılır · Paketten {sessionCost} seans düşer
          </p>
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
                <span>⏱ {s.durationMinutes} dk · 🎫 {s.sessionCost || 1} kredi</span>
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
  sessionCount: number;
  price: string;
  validityDays: number;
  sessionType: string;
  active: boolean;
};

type PackageSaleRow = {
  id: string;
  memberName: string;
  memberPhone: string | null;
  packageName: string;
  sessionCount: number;
  remainingSessions: number;
  usedSessions: number;
  price: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

function PackagesTab() {
  const [subTab, setSubTab] = useState<'definitions' | 'sales'>('definitions');
  const [packages, setPackages] = useState<SpaPackageRow[]>([]);
  const [sales, setSales] = useState<PackageSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sessionCount, setSessionCount] = useState(10);
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState(365);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgTypes, salesData] = await Promise.all([
        apiJson<SpaPackageRow[]>('/admin/package-types'),
        apiJson<PackageSaleRow[]>('/admin/spa-package-sales'),
      ]);
      setPackages(pkgTypes.filter(p => p.sessionType === 'massage'));
      setSales(salesData);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void loadAll(); }); }, [loadAll]);

  function resetForm() { setEditId(null); setName(''); setSessionCount(10); setPrice(''); setValidityDays(365); setActive(true); setShowForm(false); }
  function startEdit(p: SpaPackageRow) { setEditId(p.id); setName(p.name); setSessionCount(p.sessionCount); setPrice(p.price); setValidityDays(p.validityDays); setActive(p.active); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), sessionCount, price: parseFloat(price), validityDays, sessionType: 'massage', active };
      if (editId) { await apiJson(`/admin/package-types/${editId}`, { method: 'PATCH', body: JSON.stringify(body) }); }
      else { await apiJson('/admin/package-types', { method: 'POST', body: JSON.stringify(body) }); }
      resetForm(); await loadAll();
    } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); }
    finally { setSaving(false); }
  }

  // Stats
  const totalSold = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.price), 0);
  const activePkgs = sales.filter(s => s.status === 'active').length;

  // Paket Yükleme Modal
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadMembers, setLoadMembers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string | null; massageSessions: number }>>([]);
  const [loadMemberSearch, setLoadMemberSearch] = useState('');
  const [loadSelectedMember, setLoadSelectedMember] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [loadSelectedPkg, setLoadSelectedPkg] = useState('');
  const [loadPackageTypes, setLoadPackageTypes] = useState<Array<{ id: string; name: string; sessionCount: number; price: string; validityDays: number }>>([]);
  const [loadSaving, setLoadSaving] = useState(false);

  async function openLoadModal() {
    setShowLoadModal(true);
    setLoadSelectedMember(null);
    setLoadSelectedPkg('');
    setLoadMemberSearch('');
    try {
      const [members, pkgTypes] = await Promise.all([
        apiJson<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string | null; massageSessions: number }>>('/admin/members?status=active'),
        apiJson<Array<{ id: string; name: string; sessionCount: number; price: string; validityDays: number; sessionType: string; active: boolean }>>('/admin/package-types'),
      ]);
      setLoadMembers(members);
      // Tüm aktif paketler (masaj + PT hepsi)
      setLoadPackageTypes(pkgTypes.filter(pt => pt.active));
    } catch { /* */ }
  }

  async function handleLoadPackage() {
    if (!loadSelectedMember || !loadSelectedPkg) return;
    setLoadSaving(true);
    try {
      await apiJson(`/admin/members/${loadSelectedMember.id}/assign-package`, {
        method: 'POST',
        body: JSON.stringify({ packageTypeId: loadSelectedPkg }),
      });
      setShowLoadModal(false);
      await loadAll();
      alert('✅ Paket başarıyla yüklendi');
    } catch (err) { alert(err instanceof Error ? err.message : 'Paket yüklenemedi'); }
    finally { setLoadSaving(false); }
  }

  const filteredLoadMembers = loadMemberSearch.length > 0
    ? loadMembers.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(loadMemberSearch.toLowerCase())).slice(0, 10)
    : loadMembers.slice(0, 10);

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Satılan Paket</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{totalSold}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Gelir</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>₺{totalRevenue.toLocaleString('tr-TR')}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Aktif Paket</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{activePkgs}</div></div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <button className={`btn-sm ${subTab === 'definitions' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('definitions')}>📦 Paket Tanımları ({packages.length})</button>
        <button className={`btn-sm ${subTab === 'sales' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('sales')}>🧾 Satış Geçmişi ({sales.length})</button>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-sm btn-primary" onClick={() => void openLoadModal()}>🎫 Üyeye Paket Yükle</button>
        </div>
      </div>

      {/* Definitions Sub-tab */}
      {subTab === 'definitions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Paket Ekle</button>
          </div>

          {showForm && (
            <form onSubmit={(e) => void handleSave(e)} className="spa-form-panel" style={{ display: 'grid', gap: '0.75rem' }}>
              <h4>{editId ? '✏️ Paket Düzenle' : '+ Yeni Masaj Paketi'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Paket Adı *</span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: 10 Seans Masaj Paketi" required className="form-input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Durum</span>
                  <select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')} className="form-input">
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Seans Sayısı *</span>
                  <input type="number" value={sessionCount} onChange={(e) => setSessionCount(Number(e.target.value))} min={1} className="form-input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Fiyat (₺) *</span>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="18000" required className="form-input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span className="form-label">Geçerlilik (gün) *</span>
                  <input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} min={1} className="form-input" />
                </label>
              </div>
              {price && sessionCount > 0 && (
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
                  💡 Seans başı: ₺{Math.round(parseFloat(price) / sessionCount).toLocaleString('tr-TR')} · {validityDays} gün geçerli
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-sm btn-primary" disabled={saving}>{saving ? '⏳...' : editId ? '✓ Güncelle' : '✓ Oluştur'}</button>
                <button type="button" className="btn-sm btn-outline" onClick={resetForm}>İptal</button>
              </div>
            </form>
          )}

          {packages.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">📦</span><p>Henüz paket tanımlı değil</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {packages.map((p) => {
                const perSession = parseFloat(p.price) / p.sessionCount;
                const soldCount = sales.filter(s => s.packageName === p.name).length;
                return (
                  <div key={p.id} className={`service-card ${!p.active ? 'trainer-card-inactive' : ''}`}>
                    <div className="service-card-header">
                      <span className="service-category">📦 {p.sessionCount} Seans</span>
                      <span className={`service-status ${p.active ? 'active' : 'inactive'}`}>{p.active ? 'Aktif' : 'Pasif'}</span>
                    </div>
                    <h3 className="service-name">{p.name}</h3>
                    <div className="service-meta">
                      <span>📅 {p.validityDays} gün</span>
                      <span className="service-price">₺{parseFloat(p.price).toLocaleString('tr-TR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Seans/₺{Math.round(perSession).toLocaleString('tr-TR')} · {soldCount} satış</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn-sm btn-outline" style={{ padding: '3px 6px', fontSize: '0.68rem' }} onClick={() => startEdit(p)}>✏️</button>
                        <button className="btn-sm btn-danger" style={{ padding: '3px 6px', fontSize: '0.68rem' }} onClick={() => { if (confirm(`"${p.name}" pasif yapılacak?`)) { void apiJson(`/admin/package-types/${p.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }).then(() => void loadAll()); } }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sales History Sub-tab */}
      {subTab === 'sales' && (
        <div>
          {sales.length === 0 ? (
            <div className="empty-state"><span className="empty-icon">🧾</span><p>Henüz paket satışı yok</p></div>
          ) : (
            <div className="members-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Üye</th>
                    <th>Paket</th>
                    <th>Yüklenen</th>
                    <th>Kullanım</th>
                    <th>Fiyat</th>
                    <th>Tarih</th>
                    <th>Bitiş</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.memberName}</strong>
                        {s.memberPhone && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{s.memberPhone}</div>}
                      </td>
                      <td>{s.packageName}</td>
                      <td><span style={{ fontWeight: 700 }}>{s.sessionCount} seans</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
                            <div style={{ width: `${Math.round((s.usedSessions / s.sessionCount) * 100)}%`, height: '100%', background: s.remainingSessions > 0 ? '#22c55e' : '#ef4444', borderRadius: 3 }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{s.usedSessions}/{s.sessionCount}</span>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 700 }}>₺{parseFloat(s.price).toLocaleString('tr-TR')}</span></td>
                      <td><span style={{ fontSize: '0.78rem' }}>{new Date(s.createdAt).toLocaleDateString('tr-TR')}</span></td>
                      <td><span style={{ fontSize: '0.78rem' }}>{new Date(s.expiresAt).toLocaleDateString('tr-TR')}</span></td>
                      <td><span className={`status-badge ${s.status === 'active' ? 'status-active' : s.status === 'depleted' ? 'status-spa-completed' : 'status-spa-cancelled'}`}>{s.status === 'active' ? 'Aktif' : s.status === 'depleted' ? 'Tükendi' : s.status === 'expired' ? 'Süresi Doldu' : s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Paket Yükleme Modal */}
      {showLoadModal && (
        <div className="agenda-modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="agenda-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="agenda-modal-header">
              <h3>🎫 Üyeye Paket Yükle</h3>
              <button className="agenda-modal-close" onClick={() => setShowLoadModal(false)}>✕</button>
            </div>

            <div className="agenda-modal-form">
              {/* Paket Seçimi */}
              <label className="form-label">Paket Seç *</label>
              <select className="form-input" value={loadSelectedPkg} onChange={(e) => setLoadSelectedPkg(e.target.value)}>
                <option value="">— Paket seçin —</option>
                {loadPackageTypes.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sessionCount} seans · ₺{parseFloat(p.price).toLocaleString('tr-TR')})</option>
                ))}
              </select>

              {/* Üye Seçimi */}
              <label className="form-label" style={{ marginTop: '0.75rem' }}>Üye Seç *</label>
              <input type="text" className="form-input" placeholder="İsim veya e-posta ile ara..." value={loadMemberSearch} onChange={(e) => setLoadMemberSearch(e.target.value)} />

              {loadSelectedMember ? (
                <div className="agenda-selected-member">
                  ✅ {loadSelectedMember.firstName} {loadSelectedMember.lastName}
                  <button className="btn-sm btn-outline" style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setLoadSelectedMember(null)}>Değiştir</button>
                </div>
              ) : (
                <div className="agenda-member-list">
                  {filteredLoadMembers.map((m) => (
                    <div key={m.id} className="agenda-member-item" onClick={() => setLoadSelectedMember(m)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div>
                          <strong>{m.firstName} {m.lastName}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block' }}>{m.email}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: m.massageSessions > 0 ? '#dcfce7' : '#f1f5f9', color: m.massageSessions > 0 ? '#166534' : '#64748b' }}>
                          {m.massageSessions > 0 ? `💆 ${m.massageSessions}` : 'Paket yok'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Özet */}
              {loadSelectedPkg && loadSelectedMember && (() => {
                const pkg = loadPackageTypes.find(p => p.id === loadSelectedPkg);
                if (!pkg) return null;
                return (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>Özet</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                      {loadSelectedMember.firstName} {loadSelectedMember.lastName} → {pkg.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
                      {pkg.sessionCount} seans · ₺{parseFloat(pkg.price).toLocaleString('tr-TR')} · {pkg.validityDays} gün geçerli
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn-sm btn-primary" disabled={!loadSelectedMember || !loadSelectedPkg || loadSaving} onClick={() => void handleLoadPackage()}>
                  {loadSaving ? '⏳...' : '✓ Paketi Yükle'}
                </button>
                <button className="btn-sm btn-outline" onClick={() => setShowLoadModal(false)}>İptal</button>
              </div>
            </div>
          </div>
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
