import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { apiBaseUrl } from '../lib/config';

type TherapistRow = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  phone: string | null;
  specialties: string[] | null;
  workingHours: Record<string, string> | null;
  avgRating: string;
  totalSessions: number;
  active: boolean;
};
type AvailabilityRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  booked: boolean;
  bookedBy: {
    reservationId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    status: string;
  } | null;
};

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const WEEKDAY_NUMS = [1, 2, 3, 4, 5, 6, 0];
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const h = 6 + i;
  return {
    start: `${h.toString().padStart(2, '0')}:00`,
    end: `${(h + 1).toString().padStart(2, '0')}:00`,
    label: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
  };
});

type ViewMode = 'list' | 'calendar';

export function TherapistsPage() {
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // CRUD
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', bio: '', specialties: '', photoUrl: '' });

  // Calendar
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarTherapist, setCalendarTherapist] = useState<TherapistRow | null>(null);
  const [schedule, setSchedule] = useState<AvailabilityRow[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [cellPopup, setCellPopup] = useState<{
    date: string;
    start: string;
    end: string;
    hasSlot: boolean;
  } | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    startDate: '',
    endDate: '',
    weekdays: [1, 2, 3, 4, 5, 6] as number[],
    startTime: '10:00',
    endTime: '20:00',
    slotDuration: 60,
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TherapistRow[]>('/spa/admin/therapists');
      setTherapists(data);
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

  // ─── CRUD ─────────────────────────────────────────────────────────────────────
  function resetForm() {
    setForm({ name: '', phone: '', bio: '', specialties: '', photoUrl: '' });
    setEditId(null);
  }
  function openEdit(t: TherapistRow) {
    setForm({
      name: t.name,
      phone: t.phone || '',
      bio: t.bio || '',
      specialties: (t.specialties || []).join(', '),
      photoUrl: t.photoUrl || '',
    });
    setEditId(t.id);
    setShowForm(true);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const base = apiBaseUrl();
      const res = await fetch(`${base}/auth/upload-image`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('fail');
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        const sb = base.replace('/api/v1', '');
        setForm((prev) => ({
          ...prev,
          photoUrl: body.url!.startsWith('http') ? body.url! : `${sb}${body.url}`,
        }));
      }
    } catch {
      setError('Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        specialties: form.specialties
          ? form.specialties
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        photoUrl: form.photoUrl || undefined,
      };
      if (editId) {
        await apiJson(`/spa/admin/therapists/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccess('✅ Güncellendi');
      } else {
        await apiJson('/spa/admin/therapists', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('✅ Eklendi');
      }
      setShowForm(false);
      resetForm();
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hata');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    await apiJson(`/spa/admin/therapists/${id}`, { method: 'DELETE' });
    await load();
  }
  async function toggleActive(t: TherapistRow) {
    await apiJson(`/spa/admin/therapists/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !t.active }),
    });
    await load();
  }

  // ─── CALENDAR ─────────────────────────────────────────────────────────────────
  function getWeekRange(offset: number) {
    const now = new Date();
    const mon = new Date(now);
    const dow = now.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    mon.setDate(now.getDate() + diff + offset * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      from: mon.toISOString().slice(0, 10),
      to: sun.toISOString().slice(0, 10),
      label: `${mon.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${sun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`,
    };
  }
  function getWeekDays(offset: number) {
    const now = new Date();
    const mon = new Date(now);
    const dow = now.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    mon.setDate(now.getDate() + diff + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return { date: d.toISOString().slice(0, 10), label: DAYS[i], dayNum: d.getDate() };
    });
  }

  function openCalendar(t: TherapistRow) {
    setCalendarTherapist(t);
    setViewMode('calendar');
    setWeekOffset(0);
    void loadCalendar(t.id, 0);
  }

  async function loadCalendar(therapistId: string, offset: number) {
    setLoadingSchedule(true);
    const { from, to } = getWeekRange(offset);
    try {
      const data = await apiJson<AvailabilityRow[]>(
        `/admin/therapists/${therapistId}/calendar?from=${from}&to=${to}`,
      );
      setSchedule(data);
    } catch {
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  }

  function changeWeek(dir: number) {
    const next = weekOffset + dir;
    setWeekOffset(next);
    if (calendarTherapist) void loadCalendar(calendarTherapist.id, next);
  }

  async function toggleSlot(date: string, startTime: string, endTime: string) {
    if (!calendarTherapist) return;
    const existing = schedule.find(
      (s) => s.date.slice(0, 10) === date && s.startTime.slice(0, 5) === startTime,
    );
    if (existing) {
      await apiJson(`/admin/therapists/${calendarTherapist.id}/calendar/${existing.id}`, {
        method: 'DELETE',
      });
    } else {
      await apiJson(`/admin/therapists/${calendarTherapist.id}/calendar`, {
        method: 'POST',
        body: JSON.stringify({ date, startTime, endTime }),
      });
    }
    void loadCalendar(calendarTherapist.id, weekOffset);
  }

  async function clearDay(date: string) {
    if (!calendarTherapist || !confirm('Günü temizle?')) return;
    await apiJson(`/admin/therapists/${calendarTherapist.id}/calendar-day?date=${date}`, {
      method: 'DELETE',
    });
    void loadCalendar(calendarTherapist.id, weekOffset);
  }

  async function bulkAdd() {
    if (!calendarTherapist) return;
    setBulkSaving(true);
    try {
      const startH = parseInt(bulkForm.startTime.split(':')[0]);
      const endH = parseInt(bulkForm.endTime.split(':')[0]);
      let total = 0;
      for (let h = startH; h < endH; h += bulkForm.slotDuration / 60) {
        const ss = `${Math.floor(h).toString().padStart(2, '0')}:00`;
        const se = `${Math.floor(h + bulkForm.slotDuration / 60)
          .toString()
          .padStart(2, '0')}:00`;
        const res = await apiJson<{ created: number }>(
          `/admin/therapists/${calendarTherapist.id}/calendar/bulk`,
          { method: 'POST', body: JSON.stringify({ ...bulkForm, startTime: ss, endTime: se }) },
        );
        total += res.created;
      }
      setSuccess(`✅ ${total} slot oluşturuldu`);
      setShowBulkForm(false);
      void loadCalendar(calendarTherapist.id, weekOffset);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setBulkSaving(false);
    }
  }

  const weekRange = getWeekRange(weekOffset);
  const weekDays = getWeekDays(weekOffset);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALENDAR VIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  if (viewMode === 'calendar' && calendarTherapist) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <button className="btn-back" onClick={() => setViewMode('list')}>
              ← Masözlere Dön
            </button>
            <h1 className="dashboard-title">{calendarTherapist.name} — Ajanda</h1>
            <p className="dashboard-subtitle">
              Müsait saatleri belirleyin. Hücrelere tıklayarak ekle/kaldır.
            </p>
          </div>
          <button className="btn-primary-lg" onClick={() => setShowBulkForm(true)}>
            📋 Haftalık Program Oluştur
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        {showBulkForm && (
          <div className="bulk-form-card">
            <h4>📋 Toplu Program Oluştur</h4>
            <div className="form-grid">
              <label>
                Başlangıç{' '}
                <input
                  type="date"
                  value={bulkForm.startDate}
                  onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                />
              </label>
              <label>
                Bitiş{' '}
                <input
                  type="date"
                  value={bulkForm.endDate}
                  onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                />
              </label>
              <label>
                İlk Saat{' '}
                <input
                  type="time"
                  value={bulkForm.startTime}
                  onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                />
              </label>
              <label>
                Son Saat{' '}
                <input
                  type="time"
                  value={bulkForm.endTime}
                  onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                />
              </label>
              <label style={{ gridColumn: '1/-1' }}>
                Günler{' '}
                <div className="weekday-selector">
                  {DAYS.map((d, i) => (
                    <label
                      key={i}
                      className={`weekday-chip ${bulkForm.weekdays.includes(WEEKDAY_NUMS[i]) ? 'weekday-chip-active' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={bulkForm.weekdays.includes(WEEKDAY_NUMS[i])}
                        onChange={(e) =>
                          setBulkForm({
                            ...bulkForm,
                            weekdays: e.target.checked
                              ? [...bulkForm.weekdays, WEEKDAY_NUMS[i]]
                              : bulkForm.weekdays.filter((w) => w !== WEEKDAY_NUMS[i]),
                          })
                        }
                        style={{ display: 'none' }}
                      />
                      {d.slice(0, 3)}
                    </label>
                  ))}
                </div>
              </label>
              <div className="form-actions">
                <button className="primary" onClick={() => void bulkAdd()} disabled={bulkSaving}>
                  {bulkSaving ? '⏳...' : '✓ Oluştur'}
                </button>
                <button className="secondary" onClick={() => setShowBulkForm(false)}>
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="week-nav">
          <button className="btn-sm btn-outline" onClick={() => changeWeek(-1)}>
            ‹ Önceki
          </button>
          <span className="week-label">{weekRange.label}</span>
          <button className="btn-sm btn-outline" onClick={() => changeWeek(1)}>
            Sonraki ›
          </button>
          <button
            className="btn-sm btn-outline"
            onClick={() => {
              setWeekOffset(0);
              void loadCalendar(calendarTherapist.id, 0);
            }}
          >
            Bugün
          </button>
        </div>

        {loadingSchedule ? (
          <p className="muted">Yükleniyor...</p>
        ) : (
          <div className="calendar-grid">
            <div className="calendar-header-row">
              <div className="calendar-time-col">Saat</div>
              {weekDays.map((day) => {
                const today = new Date().toISOString().slice(0, 10);
                return (
                  <div
                    key={day.date}
                    className={`calendar-day-col ${day.date < today ? 'cal-day-past' : ''} ${day.date === today ? 'cal-day-today' : ''}`}
                  >
                    <span className="cal-day-name">{day.label.slice(0, 3)}</span>
                    <span className="cal-day-num">{day.dayNum}</span>
                    {day.date === today && <span className="cal-today-badge">Bugün</span>}
                    {schedule.filter((s) => s.date.slice(0, 10) === day.date).length > 0 && (
                      <button className="cal-clear-btn" onClick={() => void clearDay(day.date)}>
                        🗑
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {TIME_SLOTS.map((slot) => (
              <div key={slot.start} className="calendar-row">
                <div className="calendar-time-cell">{slot.label}</div>
                {weekDays.map((day) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const currentHour = new Date().getHours();
                  const slotHour = parseInt(slot.start);
                  const isPast =
                    day.date < today || (day.date === today && slotHour <= currentHour);
                  const slotData = schedule.find(
                    (s) =>
                      s.date.slice(0, 10) === day.date && s.startTime.slice(0, 5) === slot.start,
                  );
                  const hasSlot = !!slotData;
                  const isBooked = slotData?.booked || false;
                  const isPopup = cellPopup?.date === day.date && cellPopup?.start === slot.start;
                  return (
                    <div
                      key={`${day.date}-${slot.start}`}
                      className={`calendar-cell ${isPast ? 'calendar-cell-disabled' : ''} ${hasSlot ? (isBooked ? 'calendar-cell-booked' : 'calendar-cell-active') : ''} ${isPopup ? 'calendar-cell-selected' : ''}`}
                      onClick={() => {
                        if (isPast) return;
                        setCellPopup(
                          isPopup
                            ? null
                            : { date: day.date, start: slot.start, end: slot.end, hasSlot },
                        );
                      }}
                    >
                      {isPast && hasSlot && !isBooked && <span className="cell-check-past">✓</span>}
                      {!isPast && hasSlot && !isBooked && (
                        <span className="cell-check">Müsait</span>
                      )}
                      {!isPast && isBooked && (
                        <span className="cell-booked-name">
                          {slotData?.bookedBy?.firstName} {slotData?.bookedBy?.lastName?.charAt(0)}.
                        </span>
                      )}
                      {isPopup && !isPast && (
                        <div className="cell-popup" onClick={(e) => e.stopPropagation()}>
                          <div className="cell-popup-header">
                            {day.label.slice(0, 3)} {day.dayNum} · {slot.label}
                          </div>
                          {isBooked && slotData?.bookedBy && (
                            <div className="cell-popup-booked">
                              👤 {slotData.bookedBy.firstName} {slotData.bookedBy.lastName}
                              {slotData.bookedBy.phone && (
                                <a
                                  href={`tel:${slotData.bookedBy.phone}`}
                                  className="cell-popup-phone"
                                >
                                  📞 {slotData.bookedBy.phone}
                                </a>
                              )}
                            </div>
                          )}
                          {hasSlot ? (
                            isBooked ? (
                              <div className="cell-popup-actions">
                                <div className="cell-popup-info">
                                  🔵 Randevu:{' '}
                                  {slotData?.bookedBy?.status === 'confirmed'
                                    ? 'Onaylı'
                                    : 'Bekliyor'}
                                </div>
                              </div>
                            ) : (
                              <div className="cell-popup-actions">
                                <button
                                  className="cell-popup-btn cell-popup-close"
                                  onClick={() => {
                                    void toggleSlot(day.date, slot.start, slot.end);
                                    setCellPopup(null);
                                  }}
                                >
                                  🔴 Rezervasyona Kapat
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="cell-popup-actions">
                              <button
                                className="cell-popup-btn cell-popup-open"
                                onClick={() => {
                                  void toggleSlot(day.date, slot.start, slot.end);
                                  setCellPopup(null);
                                }}
                              >
                                🟢 Rezervasyona Aç
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="calendar-legend">
          <span>
            <span className="legend-dot legend-green"></span> Müsait
          </span>
          <span>
            <span className="legend-dot legend-blue"></span> Dolu
          </span>
          <span>
            <span className="legend-dot legend-gray"></span> Geçmiş
          </span>
          <span>
            <span className="legend-dot legend-today"></span> Bugün
          </span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Masöz Yönetimi</h1>
          <p className="dashboard-subtitle">Masözleri ekle, düzenle, ajandalarını yönet</p>
        </div>
        <button
          className="btn-primary-lg"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Yeni Masöz Ekle
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>{editId ? '✏️ Düzenle' : '➕ Yeni Masöz'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>
              Ad *{' '}
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Telefon{' '}
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Biyografi{' '}
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={2}
              />
            </label>
            <label>
              Uzmanlık{' '}
              <input
                value={form.specialties}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                placeholder="Klasik, Bali, Aroma"
              />
            </label>
            <label>
              Fotoğraf{' '}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageUpload(f);
                }}
                disabled={uploading}
              />
              {form.photoUrl && (
                <img
                  src={form.photoUrl}
                  alt=""
                  style={{ marginTop: 8, maxHeight: 50, borderRadius: 8 }}
                />
              )}
            </label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? '...' : editId ? 'Güncelle' : 'Ekle'}
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
      ) : therapists.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💆</span>
          <p>Henüz masöz yok</p>
        </div>
      ) : (
        <div className="trainers-grid">
          {therapists.map((t) => (
            <div key={t.id} className="trainer-card">
              <div className="trainer-card-header">
                <div className="trainer-avatar-lg">
                  {t.photoUrl ? <img src={t.photoUrl} alt={t.name} /> : <span>{t.name[0]}</span>}
                </div>
                <div className="trainer-card-info">
                  <h3>{t.name}</h3>
                  {t.phone && <p className="trainer-phone">📞 {t.phone}</p>}
                </div>
                <div className="trainer-rating">
                  <span className="rating-star">⭐</span>
                  <span>{Number(t.avgRating).toFixed(1)}</span>
                </div>
              </div>
              <div className="trainer-card-body">
                {t.specialties && t.specialties.length > 0 && (
                  <div className="trainer-tags">
                    {t.specialties.map((sp, i) => (
                      <span key={i} className="tag">
                        {sp}
                      </span>
                    ))}
                  </div>
                )}
                <div className="trainer-stats-row">
                  <span>{t.active ? '🟢 Aktif' : '🔴 Pasif'}</span>
                  <span>📊 {t.totalSessions || 0} seans</span>
                </div>
              </div>
              <div className="trainer-actions">
                <button className="btn-sm btn-schedule" onClick={() => openCalendar(t)}>
                  🗓️ Ajanda
                </button>
                <button className="btn-sm btn-outline" onClick={() => openEdit(t)}>
                  ✏️ Düzenle
                </button>
                <button className="btn-sm btn-outline" onClick={() => void toggleActive(t)}>
                  {t.active ? '⏸ Pasif' : '▶ Aktif'}
                </button>
                <button className="btn-sm btn-danger" onClick={() => void handleDelete(t.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
