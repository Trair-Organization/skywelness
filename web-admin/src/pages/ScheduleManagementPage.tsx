import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type TrainerRow = {
  id: string;
  firstName: string;
  lastName: string;
  offersSessionTypes: string[];
  photoUrl: string | null;
};
type TherapistRow = {
  id: string;
  name: string;
  workingHours: Record<string, string> | null;
  active: boolean;
  specialties: string[];
  phone: string | null;
};
type AvailabilityRow = {
  id: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
};

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_NUMS = [1, 2, 3, 4, 5, 6, 0];

// Saat dilimleri oluştur (08:00 - 22:00 arası, 1'er saat)
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const h = 8 + i;
  return {
    start: `${h.toString().padStart(2, '0')}:00`,
    end: `${(h + 1).toString().padStart(2, '0')}:00`,
    label: `${h.toString().padStart(2, '0')}:00`,
  };
});

type TabType = 'trainers' | 'therapists';

export function ScheduleManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('trainers');
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Eğitmen/Masöz seçimi
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<AvailabilityRow[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Toplu program oluşturma
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    startDate: '',
    endDate: '',
    weekdays: [1, 2, 3, 4, 5] as number[],
    startTime: '09:00',
    endTime: '18:00',
    slotDuration: 60, // dakika
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  // Masöz çalışma saatleri
  const [editingTherapist, setEditingTherapist] = useState<string | null>(null);
  const [therapistHours, setTherapistHours] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, th] = await Promise.all([
        apiJson<TrainerRow[]>('/admin/trainers'),
        apiJson<TherapistRow[]>('/admin/therapists/schedules'),
      ]);
      setTrainers(t);
      setTherapists(th);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData]);

  // ─── Hafta Hesaplama ──────────────────────────────────────────────────────────
  function getWeekRange(offset: number) {
    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diffToMonday + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
      label: `${monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${sunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    };
  }

  function getWeekDays(offset: number) {
    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diffToMonday + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return { date: d.toISOString().slice(0, 10), label: DAYS[i], dayNum: d.getDate() };
    });
  }

  // ─── Eğitmen Ajanda ───────────────────────────────────────────────────────────
  async function loadTrainerSchedule(trainerId: string, offset: number) {
    setLoadingSchedule(true);
    const { from, to } = getWeekRange(offset);
    try {
      const data = await apiJson<AvailabilityRow[]>(
        `/admin/trainers/${trainerId}/schedule?from=${from}&to=${to}`,
      );
      setSchedule(data);
    } catch {
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  }

  function selectPerson(id: string) {
    setSelectedPerson(id);
    setWeekOffset(0);
    void loadTrainerSchedule(id, 0);
  }

  function changeWeek(dir: number) {
    const next = weekOffset + dir;
    setWeekOffset(next);
    if (selectedPerson) void loadTrainerSchedule(selectedPerson, next);
  }

  // Tek slot ekle/sil (tıklama ile toggle)
  async function toggleSlot(date: string, startTime: string, endTime: string) {
    if (!selectedPerson) return;
    setError(null);

    // Bu slot zaten var mı?
    const existing = schedule.find((s) => s.date === date && s.startTime === startTime);
    if (existing) {
      // Sil
      await apiJson(`/admin/trainers/${selectedPerson}/schedule/${existing.id}`, {
        method: 'DELETE',
      });
    } else {
      // Ekle
      await apiJson(`/admin/trainers/${selectedPerson}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ date, startTime, endTime }),
      });
    }
    void loadTrainerSchedule(selectedPerson, weekOffset);
  }

  // Toplu program oluştur
  async function bulkAdd() {
    if (!selectedPerson) return;
    setBulkSaving(true);
    setError(null);
    try {
      // Saat dilimlerine böl
      const startH = parseInt(bulkForm.startTime.split(':')[0]);
      const endH = parseInt(bulkForm.endTime.split(':')[0]);
      let totalCreated = 0;

      for (let h = startH; h < endH; h += bulkForm.slotDuration / 60) {
        const slotStart = `${Math.floor(h).toString().padStart(2, '0')}:00`;
        const slotEnd = `${Math.floor(h + bulkForm.slotDuration / 60)
          .toString()
          .padStart(2, '0')}:00`;

        const res = await apiJson<{ created: number }>(
          `/admin/trainers/${selectedPerson}/schedule/bulk`,
          {
            method: 'POST',
            body: JSON.stringify({
              startDate: bulkForm.startDate,
              endDate: bulkForm.endDate,
              weekdays: bulkForm.weekdays,
              startTime: slotStart,
              endTime: slotEnd,
            }),
          },
        );
        totalCreated += res.created;
      }

      setSuccess(`✅ ${totalCreated} saat dilimi oluşturuldu`);
      setShowBulkForm(false);
      void loadTrainerSchedule(selectedPerson, weekOffset);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata oluştu');
    } finally {
      setBulkSaving(false);
    }
  }

  // Günün tüm slotlarını sil
  async function clearDay(date: string) {
    if (!selectedPerson) return;
    if (!confirm(`${date} tarihindeki tüm saatleri silmek istediğinize emin misiniz?`)) return;
    await apiJson(`/admin/trainers/${selectedPerson}/schedule-day?date=${date}`, {
      method: 'DELETE',
    });
    void loadTrainerSchedule(selectedPerson, weekOffset);
  }

  // ─── Masöz Çalışma Saatleri ───────────────────────────────────────────────────
  function startEditTherapist(t: TherapistRow) {
    setEditingTherapist(t.id);
    setTherapistHours(t.workingHours || {});
  }

  async function saveTherapistHours() {
    if (!editingTherapist) return;
    try {
      await apiJson(`/admin/therapists/${editingTherapist}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ workingHours: therapistHours }),
      });
      setEditingTherapist(null);
      setSuccess('✅ Çalışma saatleri kaydedildi');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  const weekRange = getWeekRange(weekOffset);
  const weekDays = getWeekDays(weekOffset);
  const selectedTrainerName = trainers.find((t) => t.id === selectedPerson);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🗓️ Ajanda Yönetimi</h1>
          <p className="dashboard-subtitle">
            Eğitmen ve masöz müsaitlik saatlerini belirleyin. Kullanıcılar sadece burada tanımlanan
            saatlere randevu alabilir.
          </p>
        </div>
      </div>

      {/* Tab Seçimi */}
      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'trainers' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('trainers')}
          >
            🏋️ Eğitmenler ({trainers.length})
          </button>
          <button
            className={`filter-tab ${activeTab === 'therapists' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('therapists')}
          >
            💆 Masözler ({therapists.length})
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {/* ═══════════════════════════════════════════════════════════════════════════
          EĞİTMEN AJANDASI
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trainers' && !loading && (
        <div className="schedule-layout">
          {/* Sol Panel: Eğitmen Listesi */}
          <div className="schedule-sidebar">
            <h3 className="schedule-sidebar-title">Eğitmen Seçin</h3>
            {trainers.map((t) => (
              <div
                key={t.id}
                className={`schedule-person ${selectedPerson === t.id ? 'schedule-person-active' : ''}`}
                onClick={() => selectPerson(t.id)}
              >
                <div className="schedule-person-avatar">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} alt="" />
                  ) : (
                    <span>
                      {t.firstName[0]}
                      {t.lastName[0]}
                    </span>
                  )}
                </div>
                <div>
                  <span className="schedule-person-name">
                    {t.firstName} {t.lastName}
                  </span>
                  <span className="schedule-person-type">
                    {t.offersSessionTypes
                      ?.map((s) => (s === 'personal_training' ? 'PT' : 'Masaj'))
                      .join(' · ')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Sağ Panel: Haftalık Takvim */}
          <div className="schedule-calendar">
            {!selectedPerson ? (
              <div className="empty-state">
                <span className="empty-icon">👈</span>
                <p>Soldan bir eğitmen seçerek müsaitlik takvimini görüntüleyin</p>
                <p className="muted">Yeşil kutular = müsait saatler. Tıklayarak ekle/kaldır.</p>
              </div>
            ) : (
              <>
                {/* Üst Bar */}
                <div className="schedule-topbar">
                  <div className="schedule-person-selected">
                    <strong>
                      {selectedTrainerName?.firstName} {selectedTrainerName?.lastName}
                    </strong>
                    <span className="muted"> — Haftalık Program</span>
                  </div>
                  <button className="btn-primary-lg" onClick={() => setShowBulkForm(true)}>
                    📋 Haftalık Program Oluştur
                  </button>
                </div>

                {/* Hafta Navigasyonu */}
                <div className="week-nav">
                  <button className="btn-sm btn-outline" onClick={() => changeWeek(-1)}>
                    ‹ Önceki Hafta
                  </button>
                  <span className="week-label">{weekRange.label}</span>
                  <button className="btn-sm btn-outline" onClick={() => changeWeek(1)}>
                    Sonraki Hafta ›
                  </button>
                  <button
                    className="btn-sm btn-outline"
                    onClick={() => {
                      setWeekOffset(0);
                      if (selectedPerson) void loadTrainerSchedule(selectedPerson, 0);
                    }}
                  >
                    Bugün
                  </button>
                </div>

                {/* Toplu Program Formu */}
                {showBulkForm && (
                  <div className="bulk-form-card">
                    <div className="bulk-form-header">
                      <h4>📋 Haftalık Çalışma Programı Oluştur</h4>
                      <p className="muted">
                        Seçtiğiniz tarih aralığında, belirlediğiniz günlerde otomatik saat dilimleri
                        oluşturulur.
                      </p>
                    </div>
                    <div className="form-grid">
                      <label>
                        Başlangıç Tarihi *{' '}
                        <input
                          type="date"
                          value={bulkForm.startDate}
                          onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        Bitiş Tarihi *{' '}
                        <input
                          type="date"
                          value={bulkForm.endDate}
                          onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                          required
                        />
                      </label>
                      <label>
                        İlk Saat *{' '}
                        <input
                          type="time"
                          value={bulkForm.startTime}
                          onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                        />
                      </label>
                      <label>
                        Son Saat *{' '}
                        <input
                          type="time"
                          value={bulkForm.endTime}
                          onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                        />
                      </label>
                      <label>
                        Seans Süresi
                        <select
                          value={bulkForm.slotDuration}
                          onChange={(e) =>
                            setBulkForm({ ...bulkForm, slotDuration: Number(e.target.value) })
                          }
                        >
                          <option value={60}>1 Saat</option>
                          <option value={90}>1.5 Saat</option>
                          <option value={120}>2 Saat</option>
                        </select>
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Çalışma Günleri *
                        <div className="weekday-selector">
                          {DAYS.map((day, i) => (
                            <label
                              key={i}
                              className={`weekday-chip ${bulkForm.weekdays.includes(WEEKDAY_NUMS[i]) ? 'weekday-chip-active' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={bulkForm.weekdays.includes(WEEKDAY_NUMS[i])}
                                onChange={(e) => {
                                  const num = WEEKDAY_NUMS[i];
                                  const next = e.target.checked
                                    ? [...bulkForm.weekdays, num]
                                    : bulkForm.weekdays.filter((w) => w !== num);
                                  setBulkForm({ ...bulkForm, weekdays: next });
                                }}
                                style={{ display: 'none' }}
                              />
                              {day.slice(0, 3)}
                            </label>
                          ))}
                        </div>
                      </label>
                      <div className="form-actions">
                        <button
                          className="primary"
                          onClick={() => void bulkAdd()}
                          disabled={bulkSaving || !bulkForm.startDate || !bulkForm.endDate}
                        >
                          {bulkSaving ? '⏳ Oluşturuluyor...' : '✓ Program Oluştur'}
                        </button>
                        <button className="secondary" onClick={() => setShowBulkForm(false)}>
                          İptal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Haftalık Takvim Grid */}
                {loadingSchedule ? (
                  <p className="muted">Takvim yükleniyor...</p>
                ) : (
                  <div className="calendar-grid">
                    {/* Başlık Satırı */}
                    <div className="calendar-header-row">
                      <div className="calendar-time-col">Saat</div>
                      {weekDays.map((day) => (
                        <div key={day.date} className="calendar-day-col">
                          <span className="cal-day-name">{day.label.slice(0, 3)}</span>
                          <span className="cal-day-num">{day.dayNum}</span>
                          {schedule.filter((s) => s.date === day.date).length > 0 && (
                            <button
                              className="cal-clear-btn"
                              onClick={() => void clearDay(day.date)}
                              title="Günü temizle"
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Saat Satırları */}
                    {TIME_SLOTS.map((slot) => (
                      <div key={slot.start} className="calendar-row">
                        <div className="calendar-time-cell">{slot.label}</div>
                        {weekDays.map((day) => {
                          const hasSlot = schedule.some(
                            (s) => s.date === day.date && s.startTime === slot.start,
                          );
                          return (
                            <div
                              key={`${day.date}-${slot.start}`}
                              className={`calendar-cell ${hasSlot ? 'calendar-cell-active' : ''}`}
                              onClick={() => void toggleSlot(day.date, slot.start, slot.end)}
                              title={hasSlot ? 'Tıklayarak kaldır' : 'Tıklayarak ekle'}
                            >
                              {hasSlot && <span className="cell-check">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                <p className="muted" style={{ marginTop: 12, fontSize: '0.8rem' }}>
                  💡 İpucu: Yeşil hücreler müsait saatleri gösterir. Hücreye tıklayarak ekle/kaldır.
                  "Haftalık Program Oluştur" ile toplu ekleme yapabilirsiniz.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MASÖZ AJANDASI
      ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'therapists' && !loading && (
        <div>
          <div className="schedule-info-banner">
            <span>💡</span>
            <p>
              Her masöz için haftalık çalışma saatlerini belirleyin. Kullanıcılar sadece bu saatler
              içinde randevu alabilir. Format: <code>10:00-20:00</code>
            </p>
          </div>

          {therapists.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">💆</span>
              <p>Henüz masöz eklenmemiş</p>
              <p className="muted">Spa & Wellness sayfasından masöz ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="therapist-cards-grid">
              {therapists.map((t) => (
                <div
                  key={t.id}
                  className={`therapist-schedule-card ${editingTherapist === t.id ? 'editing' : ''}`}
                >
                  <div className="therapist-schedule-header">
                    <div className="therapist-sch-info">
                      <h3>{t.name}</h3>
                      <span className="muted">{t.specialties?.join(', ') || 'Genel Masaj'}</span>
                      {t.phone && <span className="muted">📞 {t.phone}</span>}
                    </div>
                    <div className="therapist-sch-actions">
                      <span className={`status-dot ${t.active ? 'dot-green' : 'dot-red'}`}>
                        {t.active ? 'Aktif' : 'Pasif'}
                      </span>
                      {editingTherapist !== t.id ? (
                        <button
                          className="btn-sm btn-outline"
                          onClick={() => startEditTherapist(t)}
                        >
                          ✏️ Saatleri Düzenle
                        </button>
                      ) : (
                        <div className="edit-actions">
                          <button
                            className="btn-sm btn-success"
                            onClick={() => void saveTherapistHours()}
                          >
                            💾 Kaydet
                          </button>
                          <button
                            className="btn-sm btn-outline"
                            onClick={() => setEditingTherapist(null)}
                          >
                            İptal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingTherapist === t.id ? (
                    <div className="wh-edit-grid">
                      {DAY_KEYS.map((key, i) => (
                        <div key={key} className="wh-edit-row">
                          <span className="wh-edit-day">{DAYS[i]}</span>
                          <input
                            type="text"
                            value={therapistHours[key] || ''}
                            onChange={(e) =>
                              setTherapistHours({ ...therapistHours, [key]: e.target.value })
                            }
                            placeholder="Kapalı"
                            className="wh-edit-input"
                          />
                          {therapistHours[key] && (
                            <button
                              className="wh-clear-btn"
                              onClick={() => setTherapistHours({ ...therapistHours, [key]: '' })}
                              title="Kapalı yap"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="wh-display-grid">
                      {DAY_KEYS.map((key, i) => (
                        <div
                          key={key}
                          className={`wh-display-cell ${t.workingHours?.[key] ? 'wh-open' : 'wh-closed'}`}
                        >
                          <span className="wh-cell-day">{DAYS[i].slice(0, 3)}</span>
                          <span className="wh-cell-time">{t.workingHours?.[key] || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
