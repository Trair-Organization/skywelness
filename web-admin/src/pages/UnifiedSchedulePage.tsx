import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type Resource = {
  id: string;
  kind: 'trainer' | 'therapist';
  name: string;
  photoUrl: string | null;
  specialties?: string[] | null;
};
type Cell = {
  state: 'available' | 'booked';
  availabilityId?: string;
  reservationId?: string;
  endTime?: string;
  serviceName?: string | null;
  bookedBy?: {
    firstName: string;
    lastName: string;
    phone: string | null;
    status: string;
  } | null;
};
type GridResponse = {
  date: string;
  resources: Resource[];
  grid: Record<string, Record<string, Cell>>;
};
type Summary = {
  date: string;
  trainers: { resourceCount: number; available: number; booked: number; total: number };
  therapists: { resourceCount: number; available: number; booked: number; total: number };
  total: number;
  totalBooked: number;
  occupancyRate: number;
};
type Member = { id: string; firstName: string; lastName: string; email: string };
type Service = {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  price: string;
  currency: string;
};

type Tab = 'trainers' | 'therapists' | 'summary';

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = 6 + i;
  return `${h.toString().padStart(2, '0')}:00`;
});

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDays(d: string, n: number): string {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function trDate(d: string): string {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function UnifiedSchedulePage() {
  const [tab, setTab] = useState<Tab>('trainers');
  const [date, setDate] = useState<string>(todayISO());
  const [trainerData, setTrainerData] = useState<GridResponse | null>(null);
  const [therapistData, setTherapistData] = useState<GridResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Popup state (hücreye tıklama)
  const [popup, setPopup] = useState<{
    resource: Resource;
    hour: string;
    cell: Cell | null;
  } | null>(null);

  // Rezervasyon modal state
  const [bookingModal, setBookingModal] = useState<{
    resource: Resource;
    hour: string;
  } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState<{
    resource: Resource;
    reservationId: string;
  } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');

  // Quick-create member modal
  const [newMemberModal, setNewMemberModal] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  });
  const [newMemberSaving, setNewMemberSaving] = useState(false);

  // Bulk open modal
  const [bulkOpenModal, setBulkOpenModal] = useState(false);
  const [allTrainers, setAllTrainers] = useState<{ id: string; name: string }[]>([]);
  const [allTherapists, setAllTherapists] = useState<{ id: string; name: string }[]>([]);
  const [bulkForm, setBulkForm] = useState({
    startDate: todayISO(),
    endDate: addDays(todayISO(), 6),
    weekdays: [1, 2, 3, 4, 5, 6] as number[],
    startTime: '09:00',
    endTime: '21:00',
    trainerIds: [] as string[],
    therapistIds: [] as string[],
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  const isPastDate = useMemo(() => date < todayISO(), [date]);
  const isToday = useMemo(() => date === todayISO(), [date]);
  const currentHour = useMemo(() => new Date().getHours(), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tr, th, sum] = await Promise.all([
        apiJson<GridResponse>(`/admin/schedule/daily/trainers?date=${date}`),
        apiJson<GridResponse>(`/admin/schedule/daily/therapists?date=${date}`),
        apiJson<Summary>(`/admin/schedule/daily/summary?date=${date}`),
      ]);
      setTrainerData(tr);
      setTherapistData(th);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  async function openBookingModal(resource: Resource, hour: string) {
    setBookingModal({ resource, hour });
    setPopup(null);
    setSelectedMemberId('');
    setSelectedServiceId('');
    setBookingNotes('');
    try {
      const [memberList, serviceList] = await Promise.all([
        apiJson<Member[]>('/admin/members?status=active'),
        resource.kind === 'therapist'
          ? apiJson<Service[]>(`/admin/therapists/${resource.id}/services`)
          : Promise.resolve([]),
      ]);
      setMembers(memberList);
      setServices(serviceList);
    } catch {
      setMembers([]);
      setServices([]);
    }
  }

  async function createBooking() {
    if (!bookingModal || !selectedMemberId) return;
    const { resource, hour } = bookingModal;
    const endHour = (parseInt(hour) + 1).toString().padStart(2, '0') + ':00';
    setBookingSaving(true);
    try {
      if (resource.kind === 'trainer') {
        await apiJson('/admin/reservations/create', {
          method: 'POST',
          body: JSON.stringify({
            trainerId: resource.id,
            userId: selectedMemberId,
            date,
            startTime: hour,
            endTime: endHour,
            notes: bookingNotes.trim() || undefined,
          }),
        });
      } else {
        const payload: Record<string, unknown> = {
          therapistId: resource.id,
          userId: selectedMemberId,
          date,
          startTime: hour,
        };
        if (selectedServiceId) payload.serviceId = selectedServiceId;
        else payload.endTime = endHour;
        if (bookingNotes.trim()) payload.notes = bookingNotes.trim();
        await apiJson('/admin/therapists/reservations/create', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setSuccess('✅ Randevu oluşturuldu');
      setBookingModal(null);
      void loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setBookingSaving(false);
    }
  }

  async function rescheduleReservation() {
    if (!rescheduleModal || !rescheduleDate) return;
    try {
      const endHour =
        (parseInt(rescheduleTime.split(':')[0]) + 1).toString().padStart(2, '0') + ':00';
      const path =
        rescheduleModal.resource.kind === 'trainer'
          ? `/admin/reservations/${rescheduleModal.reservationId}/reschedule`
          : `/admin/therapists/reservations/${rescheduleModal.reservationId}/reschedule`;
      const body: Record<string, unknown> = {
        newDate: rescheduleDate,
        newStartTime: rescheduleTime,
        newEndTime: endHour,
      };
      if (rescheduleModal.resource.kind === 'therapist') {
        body.therapistId = rescheduleModal.resource.id;
      }
      await apiJson(path, { method: 'POST', body: JSON.stringify(body) });
      setSuccess('✅ Randevu ileri tarihe taşındı');
      setRescheduleModal(null);
      void loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Taşıma başarısız');
    }
  }

  async function quickCreateMember() {
    if (!newMemberForm.firstName.trim() || !newMemberForm.lastName.trim()) {
      setError('Ad ve soyad zorunlu');
      return;
    }
    setNewMemberSaving(true);
    try {
      const res = await apiJson<Member>('/admin/members/quick-create', {
        method: 'POST',
        body: JSON.stringify({
          firstName: newMemberForm.firstName.trim(),
          lastName: newMemberForm.lastName.trim(),
          phone: newMemberForm.phone.trim() || undefined,
          email: newMemberForm.email.trim() || undefined,
        }),
      });
      // Listeye ekle ve seç
      setMembers((prev) => [res, ...prev]);
      setSelectedMemberId(res.id);
      setNewMemberModal(false);
      setNewMemberForm({ firstName: '', lastName: '', phone: '', email: '' });
      setSuccess('✅ Üye oluşturuldu ve seçildi');
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setNewMemberSaving(false);
    }
  }

  async function openBulkModal() {
    setBulkOpenModal(true);
    // Kaynakları yükle
    if (trainerData?.resources) {
      setAllTrainers(trainerData.resources.map((r) => ({ id: r.id, name: r.name })));
    }
    if (therapistData?.resources) {
      setAllTherapists(therapistData.resources.map((r) => ({ id: r.id, name: r.name })));
    }
  }

  async function runBulkOpen() {
    if (bulkForm.trainerIds.length === 0 && bulkForm.therapistIds.length === 0) {
      setError('En az bir eğitmen veya masöz seçilmeli');
      return;
    }
    setBulkSaving(true);
    try {
      const res = await apiJson<{ created: number }>('/admin/schedule/bulk-open', {
        method: 'POST',
        body: JSON.stringify(bulkForm),
      });
      setSuccess(`✅ ${res.created} slot oluşturuldu`);
      setBulkOpenModal(false);
      void loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setBulkSaving(false);
    }
  }

  async function toggleSlot(resource: Resource, hour: string, cell: Cell | null) {
    const endHour = (parseInt(hour) + 1).toString().padStart(2, '0') + ':00';
    try {
      if (cell?.availabilityId) {
        // Slot'u kapat (availability sil)
        const base =
          resource.kind === 'trainer'
            ? `/admin/trainers/${resource.id}/calendar`
            : `/admin/therapists/${resource.id}/calendar`;
        await apiJson(`${base}/${cell.availabilityId}`, { method: 'DELETE' });
      } else {
        // Slot'u aç (availability ekle)
        const base =
          resource.kind === 'trainer'
            ? `/admin/trainers/${resource.id}/calendar`
            : `/admin/therapists/${resource.id}/calendar`;
        await apiJson(base, {
          method: 'POST',
          body: JSON.stringify({ date, startTime: hour, endTime: endHour }),
        });
      }
      setPopup(null);
      void loadAll();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    }
  }

  async function cancelReservation(reservationId: string) {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/admin/reservations/${reservationId}/cancel`, { method: 'POST' });
      setSuccess('✅ Rezervasyon iptal edildi');
      setPopup(null);
      void loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İptal başarısız');
    }
  }

  function renderGrid(data: GridResponse | null, kind: 'trainer' | 'therapist') {
    if (!data) return null;
    if (data.resources.length === 0) {
      return (
        <p className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
          Henüz {kind === 'trainer' ? 'eğitmen' : 'masöz'} tanımlanmamış.
        </p>
      );
    }
    return (
      <div className="unified-grid-wrap">
        <table className="unified-grid">
          <thead>
            <tr>
              <th className="unified-grid-corner">Saat</th>
              {data.resources.map((r) => (
                <th key={r.id} className="unified-grid-res">
                  <div className="unified-res-header">
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.name} className="unified-res-avatar" />
                    ) : (
                      <span className="unified-res-avatar-fallback">
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="unified-res-name">{r.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => {
              const hourNum = parseInt(hour);
              const slotIsPast = isPastDate || (isToday && hourNum <= currentHour);
              return (
                <tr key={hour}>
                  <td className="unified-grid-hour">{hour}</td>
                  {data.resources.map((r) => {
                    const cell = data.grid[r.id]?.[hour] ?? null;
                    let cls = 'unified-cell';
                    if (slotIsPast) cls += ' unified-cell-past';
                    if (cell?.state === 'available') cls += ' unified-cell-avail';
                    if (cell?.state === 'booked') cls += ' unified-cell-booked';
                    const isOpenPopup = popup?.resource.id === r.id && popup?.hour === hour;
                    if (isOpenPopup) cls += ' unified-cell-selected';
                    return (
                      <td
                        key={`${r.id}-${hour}`}
                        className={cls}
                        onClick={() => {
                          if (slotIsPast) return;
                          setPopup(isOpenPopup ? null : { resource: r, hour, cell });
                        }}
                      >
                        {cell?.state === 'available' && !cell.bookedBy && (
                          <span className="unified-cell-label">Müsait</span>
                        )}
                        {cell?.state === 'booked' && cell.bookedBy && (
                          <span className="unified-cell-label unified-booked-name">
                            {cell.bookedBy.firstName} {cell.bookedBy.lastName.charAt(0)}.
                          </span>
                        )}
                        {isOpenPopup && !slotIsPast && (
                          <div className="cell-popup" onClick={(e) => e.stopPropagation()}>
                            <div className="cell-popup-header">
                              {r.name} · {hour}
                            </div>
                            {cell?.state === 'booked' && cell.bookedBy && (
                              <>
                                <div className="cell-popup-booked">
                                  👤 {cell.bookedBy.firstName} {cell.bookedBy.lastName}
                                  {cell.bookedBy.phone && (
                                    <a
                                      href={`tel:${cell.bookedBy.phone}`}
                                      className="cell-popup-phone"
                                    >
                                      📞 {cell.bookedBy.phone}
                                    </a>
                                  )}
                                  {cell.serviceName && (
                                    <span className="cell-popup-service">
                                      💆 {cell.serviceName}
                                    </span>
                                  )}
                                </div>
                                <div className="cell-popup-actions">
                                  <button
                                    className="cell-popup-btn cell-popup-cancel"
                                    onClick={() => void cancelReservation(cell.reservationId!)}
                                  >
                                    ❌ Rezervasyonu İptal Et
                                  </button>
                                  <button
                                    className="cell-popup-btn cell-popup-reschedule"
                                    onClick={() => {
                                      setRescheduleModal({
                                        resource: r,
                                        reservationId: cell.reservationId!,
                                      });
                                      setRescheduleDate(date);
                                      setRescheduleTime(hour);
                                      setPopup(null);
                                    }}
                                  >
                                    🔄 İleri Tarihe Al
                                  </button>
                                </div>
                              </>
                            )}
                            {cell?.state === 'available' && (
                              <div className="cell-popup-actions">
                                <button
                                  className="cell-popup-btn cell-popup-book"
                                  onClick={() => void openBookingModal(r, hour)}
                                >
                                  📝 Üye Adına Randevu Ekle
                                </button>
                                <button
                                  className="cell-popup-btn cell-popup-close"
                                  onClick={() => void toggleSlot(r, hour, cell)}
                                >
                                  🔴 Rezervasyona Kapat
                                </button>
                              </div>
                            )}
                            {!cell && (
                              <div className="cell-popup-actions">
                                <button
                                  className="cell-popup-btn cell-popup-open"
                                  onClick={() => void toggleSlot(r, hour, null)}
                                >
                                  🟢 Rezervasyona Aç
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSummary() {
    if (!summary) return null;
    const { trainers, therapists, total, totalBooked, occupancyRate } = summary;
    return (
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">📊 Günlük Doluluk</div>
          <div className="summary-card-value">{occupancyRate}%</div>
          <div className="summary-card-sub">
            {totalBooked} / {total} slot
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">🏋️ Eğitmenler</div>
          <div className="summary-card-value">
            {trainers.booked} <span className="summary-card-mini">/ {trainers.total}</span>
          </div>
          <div className="summary-card-sub">
            {trainers.resourceCount} eğitmen · {trainers.available} müsait
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card-label">💆 Masözler</div>
          <div className="summary-card-value">
            {therapists.booked} <span className="summary-card-mini">/ {therapists.total}</span>
          </div>
          <div className="summary-card-sub">
            {therapists.resourceCount} masöz · {therapists.available} müsait
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🗓️ Ajanda Yönetimi</h1>
          <p className="dashboard-subtitle">
            Günlük eğitmen ve masöz matrisi — tek bakışta tüm kaynaklar
          </p>
        </div>
        <button className="btn-primary-lg" onClick={() => void openBulkModal()}>
          📋 Toplu Program Oluştur
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      <div className="schedule-date-bar">
        <button className="btn-sm btn-outline" onClick={() => setDate(addDays(date, -1))}>
          ‹ Önceki
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="schedule-date-input"
        />
        <span className="schedule-date-label">{trDate(date)}</span>
        <button className="btn-sm btn-outline" onClick={() => setDate(addDays(date, 1))}>
          Sonraki ›
        </button>
        <button className="btn-sm btn-outline" onClick={() => setDate(todayISO())}>
          Bugün
        </button>
      </div>

      <div className="schedule-tabs">
        <button
          className={`schedule-tab ${tab === 'trainers' ? 'schedule-tab-active' : ''}`}
          onClick={() => setTab('trainers')}
        >
          🏋️ Eğitmenler
          {trainerData && (
            <span className="schedule-tab-badge">{trainerData.resources.length}</span>
          )}
        </button>
        <button
          className={`schedule-tab ${tab === 'therapists' ? 'schedule-tab-active' : ''}`}
          onClick={() => setTab('therapists')}
        >
          💆 Masözler
          {therapistData && (
            <span className="schedule-tab-badge">{therapistData.resources.length}</span>
          )}
        </button>
        <button
          className={`schedule-tab ${tab === 'summary' ? 'schedule-tab-active' : ''}`}
          onClick={() => setTab('summary')}
        >
          📊 Günlük Özet
        </button>
      </div>

      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : (
        <>
          {tab === 'trainers' && renderGrid(trainerData, 'trainer')}
          {tab === 'therapists' && renderGrid(therapistData, 'therapist')}
          {tab === 'summary' && renderSummary()}
        </>
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <div className="modal-overlay" onClick={() => setBookingModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                📝{' '}
                {bookingModal.resource.kind === 'trainer'
                  ? 'Üye Adına PT Randevusu'
                  : 'Üye Adına Masaj Randevusu'}
              </h3>
              <button className="modal-close" onClick={() => setBookingModal(null)}>
                ✕
              </button>
            </div>
            <p className="muted">
              {date} · Başlangıç {bookingModal.hour} · {bookingModal.resource.name}
            </p>
            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                }}
              >
                Üye Seçin *
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="">Üye seçin…</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} — {m.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-sm btn-outline"
                  onClick={() => setNewMemberModal(true)}
                  style={{ whiteSpace: 'nowrap' }}
                  title="Sisteme kayıtlı olmayan walk-in üye için hızlı kayıt"
                >
                  ➕ Yeni
                </button>
              </div>
            </div>
            {bookingModal.resource.kind === 'therapist' && (
              <div style={{ marginTop: 12 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: '0.85rem',
                    color: 'var(--muted)',
                  }}
                >
                  Masaj Hizmeti
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="">
                    {services.length === 0
                      ? 'Hizmet bulunamadı (varsayılan 1 saat)'
                      : 'Hizmet seçin…'}
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMinutes} dk · {s.price} {s.currency}
                    </option>
                  ))}
                </select>
                {selectedServiceId &&
                  (() => {
                    const svc = services.find((s) => s.id === selectedServiceId);
                    if (!svc) return null;
                    const [hh, mm] = bookingModal.hour.split(':').map((v) => parseInt(v, 10));
                    const total = hh * 60 + mm + svc.durationMinutes;
                    const endH = Math.floor(total / 60) % 24;
                    const endM = total % 60;
                    const endLabel = `${endH.toString().padStart(2, '0')}:${endM
                      .toString()
                      .padStart(2, '0')}`;
                    return (
                      <p
                        style={{
                          marginTop: 8,
                          fontSize: '0.85rem',
                          color: 'var(--muted)',
                        }}
                      >
                        ⏱ Seans: {bookingModal.hour} → {endLabel} ({svc.durationMinutes} dk) · 💰{' '}
                        {svc.price} {svc.currency}
                      </p>
                    );
                  })()}
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                }}
              >
                Notlar (opsiyonel)
              </label>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                rows={2}
                placeholder="Örn: bel sakatlığı var, yumuşak bas"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="primary"
                onClick={() => void createBooking()}
                disabled={!selectedMemberId || bookingSaving}
              >
                {bookingSaving ? '⏳…' : '✓ Oluştur'}
              </button>
              <button className="secondary" onClick={() => setBookingModal(null)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔄 Randevuyu İleri Tarihe Al</h3>
              <button className="modal-close" onClick={() => setRescheduleModal(null)}>
                ✕
              </button>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              {rescheduleModal.resource.name}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <label style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Yeni Tarih
                </div>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={todayISO()}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </label>
              <label style={{ flex: 1 }}>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Yeni Saat
                </div>
                <input
                  type="time"
                  step={3600}
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </label>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="primary"
                onClick={() => void rescheduleReservation()}
                disabled={!rescheduleDate}
              >
                ✓ Taşı
              </button>
              <button className="secondary" onClick={() => setRescheduleModal(null)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Member Modal */}
      {newMemberModal && (
        <div className="modal-overlay" onClick={() => setNewMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Hızlı Üye Kaydı</h3>
              <button className="modal-close" onClick={() => setNewMemberModal(false)}>
                ✕
              </button>
            </div>
            <p className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>
              Sisteme kayıtlı olmayan walk-in üyeler için — ad, soyad ve telefon yeterli.
            </p>
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <label>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Ad *
                </div>
                <input
                  value={newMemberForm.firstName}
                  onChange={(e) =>
                    setNewMemberForm({ ...newMemberForm, firstName: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Soyad *
                </div>
                <input
                  value={newMemberForm.lastName}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Telefon (opsiyonel)
                </div>
                <input
                  value={newMemberForm.phone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                  placeholder="05xxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </label>
              <label>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  E-posta (opsiyonel)
                </div>
                <input
                  type="email"
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </label>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button
                className="primary"
                onClick={() => void quickCreateMember()}
                disabled={
                  newMemberSaving ||
                  !newMemberForm.firstName.trim() ||
                  !newMemberForm.lastName.trim()
                }
              >
                {newMemberSaving ? '⏳…' : '✓ Oluştur ve Seç'}
              </button>
              <button className="secondary" onClick={() => setNewMemberModal(false)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Open Modal */}
      {bulkOpenModal && (
        <div className="modal-overlay" onClick={() => setBulkOpenModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640 }}
          >
            <div className="modal-header">
              <h3>📋 Toplu Program Oluştur</h3>
              <button className="modal-close" onClick={() => setBulkOpenModal(false)}>
                ✕
              </button>
            </div>
            <p className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>
              Seçilen tarih aralığında, seçilen günlerde ve saatlerde seçilen eğitmen/masözler için
              1&apos;er saatlik slotları toplu aç.
            </p>

            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Başlangıç Tarihi
                  </div>
                  <input
                    type="date"
                    value={bulkForm.startDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Bitiş Tarihi
                  </div>
                  <input
                    type="date"
                    value={bulkForm.endDate}
                    onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    İlk Saat
                  </div>
                  <input
                    type="time"
                    step={3600}
                    value={bulkForm.startTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Son Saat
                  </div>
                  <input
                    type="time"
                    step={3600}
                    value={bulkForm.endTime}
                    onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                </label>
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Günler
                </div>
                <div className="weekday-selector">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((lbl, idx) => {
                    const weekdayNum = [1, 2, 3, 4, 5, 6, 0][idx];
                    const checked = bulkForm.weekdays.includes(weekdayNum);
                    return (
                      <label
                        key={lbl}
                        className={`weekday-chip ${checked ? 'weekday-chip-active' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setBulkForm({
                              ...bulkForm,
                              weekdays: e.target.checked
                                ? [...bulkForm.weekdays, weekdayNum]
                                : bulkForm.weekdays.filter((w) => w !== weekdayNum),
                            })
                          }
                          style={{ display: 'none' }}
                        />
                        {lbl}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  🏋️ Eğitmenler ({allTrainers.length})
                </div>
                <div className="bulk-resource-grid">
                  {allTrainers.length === 0 && (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      Eğitmen yok
                    </span>
                  )}
                  {allTrainers.map((t) => {
                    const checked = bulkForm.trainerIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`weekday-chip ${checked ? 'weekday-chip-active' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setBulkForm({
                              ...bulkForm,
                              trainerIds: e.target.checked
                                ? [...bulkForm.trainerIds, t.id]
                                : bulkForm.trainerIds.filter((id) => id !== t.id),
                            })
                          }
                          style={{ display: 'none' }}
                        />
                        {t.name}
                      </label>
                    );
                  })}
                  {allTrainers.length > 0 && (
                    <button
                      type="button"
                      className="btn-sm btn-outline"
                      onClick={() =>
                        setBulkForm({
                          ...bulkForm,
                          trainerIds:
                            bulkForm.trainerIds.length === allTrainers.length
                              ? []
                              : allTrainers.map((t) => t.id),
                        })
                      }
                    >
                      {bulkForm.trainerIds.length === allTrainers.length ? 'Hiçbiri' : 'Tümünü Seç'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>
                  💆 Masözler ({allTherapists.length})
                </div>
                <div className="bulk-resource-grid">
                  {allTherapists.length === 0 && (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      Masöz yok
                    </span>
                  )}
                  {allTherapists.map((t) => {
                    const checked = bulkForm.therapistIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`weekday-chip ${checked ? 'weekday-chip-active' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setBulkForm({
                              ...bulkForm,
                              therapistIds: e.target.checked
                                ? [...bulkForm.therapistIds, t.id]
                                : bulkForm.therapistIds.filter((id) => id !== t.id),
                            })
                          }
                          style={{ display: 'none' }}
                        />
                        {t.name}
                      </label>
                    );
                  })}
                  {allTherapists.length > 0 && (
                    <button
                      type="button"
                      className="btn-sm btn-outline"
                      onClick={() =>
                        setBulkForm({
                          ...bulkForm,
                          therapistIds:
                            bulkForm.therapistIds.length === allTherapists.length
                              ? []
                              : allTherapists.map((t) => t.id),
                        })
                      }
                    >
                      {bulkForm.therapistIds.length === allTherapists.length
                        ? 'Hiçbiri'
                        : 'Tümünü Seç'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button className="primary" onClick={() => void runBulkOpen()} disabled={bulkSaving}>
                {bulkSaving ? '⏳…' : '✓ Slotları Aç'}
              </button>
              <button className="secondary" onClick={() => setBulkOpenModal(false)}>
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="calendar-legend" style={{ marginTop: 16 }}>
        <span>
          <span className="legend-dot legend-green"></span> Müsait
        </span>
        <span>
          <span className="legend-dot legend-blue"></span> Dolu
        </span>
        <span>
          <span className="legend-dot legend-gray"></span> Geçmiş/Kapalı
        </span>
      </div>
    </div>
  );
}
