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
  const [bookingSaving, setBookingSaving] = useState(false);

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
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                style={{
                  width: '100%',
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
