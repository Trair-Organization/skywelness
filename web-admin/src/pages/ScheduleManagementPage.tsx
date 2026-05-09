import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type TrainerRow = { id: string; firstName: string; lastName: string; offersSessionTypes: string[] };
type TherapistRow = {
  id: string;
  name: string;
  workingHours: Record<string, string> | null;
  active: boolean;
  specialties: string[];
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
const WEEKDAY_NUMS = [1, 2, 3, 4, 5, 6, 0]; // JS getDay() mapping

type TabType = 'trainers' | 'therapists';

export function ScheduleManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('trainers');
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Eğitmen ajanda state
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<AvailabilityRow[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Toplu ekleme formu
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    startDate: '',
    endDate: '',
    weekdays: [1, 2, 3, 4, 5] as number[],
    startTime: '09:00',
    endTime: '18:00',
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  // Tek slot ekleme
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotForm, setSlotForm] = useState({ date: '', startTime: '09:00', endTime: '10:00' });

  // Masöz düzenleme
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

  // Hafta hesaplama
  function getWeekRange(offset: number) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
      label: `${monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`,
    };
  }

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

  function selectTrainer(id: string) {
    setSelectedTrainer(id);
    setWeekOffset(0);
    void loadTrainerSchedule(id, 0);
  }

  function changeWeek(dir: number) {
    const next = weekOffset + dir;
    setWeekOffset(next);
    if (selectedTrainer) void loadTrainerSchedule(selectedTrainer, next);
  }

  async function addSlot() {
    if (!selectedTrainer || !slotForm.date) return;
    try {
      await apiJson(`/admin/trainers/${selectedTrainer}/schedule`, {
        method: 'POST',
        body: JSON.stringify(slotForm),
      });
      setShowAddSlot(false);
      void loadTrainerSchedule(selectedTrainer, weekOffset);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Eklenemedi');
    }
  }

  async function deleteSlot(availabilityId: string) {
    if (!selectedTrainer) return;
    await apiJson(`/admin/trainers/${selectedTrainer}/schedule/${availabilityId}`, {
      method: 'DELETE',
    });
    void loadTrainerSchedule(selectedTrainer, weekOffset);
  }

  async function bulkAdd() {
    if (!selectedTrainer) return;
    setBulkSaving(true);
    try {
      const res = await apiJson<{ created: number }>(
        `/admin/trainers/${selectedTrainer}/schedule/bulk`,
        {
          method: 'POST',
          body: JSON.stringify(bulkForm),
        },
      );
      alert(`${res.created} müsaitlik oluşturuldu`);
      setShowBulkForm(false);
      void loadTrainerSchedule(selectedTrainer, weekOffset);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setBulkSaving(false);
    }
  }

  // Masöz çalışma saatleri
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
      await loadData();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  // Haftanın günlerini oluştur
  function getWeekDays(offset: number) {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: d.toISOString().slice(0, 10),
        label: DAYS[i],
        short: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      };
    });
  }

  const weekRange = getWeekRange(weekOffset);
  const weekDays = getWeekDays(weekOffset);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Ajanda Yönetimi</h1>
          <p className="dashboard-subtitle">Eğitmen ve masöz çalışma saatlerini düzenleyin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'trainers' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('trainers')}
          >
            🏋️ Eğitmenler
          </button>
          <button
            className={`filter-tab ${activeTab === 'therapists' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('therapists')}
          >
            🧖 Masözler
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {/* ─── EĞİTMEN AJANDASI ─── */}
      {activeTab === 'trainers' && !loading && (
        <div className="schedule-layout">
          {/* Eğitmen Listesi */}
          <div className="schedule-sidebar">
            <h3 className="schedule-sidebar-title">Eğitmenler</h3>
            {trainers.map((t) => (
              <div
                key={t.id}
                className={`schedule-person ${selectedTrainer === t.id ? 'schedule-person-active' : ''}`}
                onClick={() => selectTrainer(t.id)}
              >
                <span className="schedule-person-name">
                  {t.firstName} {t.lastName}
                </span>
                <span className="schedule-person-type">
                  {t.offersSessionTypes
                    ?.map((s) => (s === 'personal_training' ? 'PT' : 'Masaj'))
                    .join(', ')}
                </span>
              </div>
            ))}
          </div>

          {/* Takvim */}
          <div className="schedule-calendar">
            {!selectedTrainer ? (
              <div className="empty-state">
                <span className="empty-icon">📅</span>
                <p>Ajandayı görmek için bir eğitmen seçin</p>
              </div>
            ) : (
              <>
                {/* Hafta Navigasyonu */}
                <div className="week-nav">
                  <button className="btn-sm btn-outline" onClick={() => changeWeek(-1)}>
                    ← Önceki
                  </button>
                  <span className="week-label">{weekRange.label}</span>
                  <button className="btn-sm btn-outline" onClick={() => changeWeek(1)}>
                    Sonraki →
                  </button>
                  <button className="btn-sm btn-success" onClick={() => setShowAddSlot(true)}>
                    + Saat Ekle
                  </button>
                  <button className="btn-sm btn-primary" onClick={() => setShowBulkForm(true)}>
                    📋 Toplu Ekle
                  </button>
                </div>

                {/* Tek Slot Ekleme */}
                {showAddSlot && (
                  <div className="inline-form">
                    <input
                      type="date"
                      value={slotForm.date}
                      onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                    />
                    <input
                      type="time"
                      value={slotForm.startTime}
                      onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    />
                    <input
                      type="time"
                      value={slotForm.endTime}
                      onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    />
                    <button className="btn-sm btn-success" onClick={() => void addSlot()}>
                      Ekle
                    </button>
                    <button className="btn-sm btn-outline" onClick={() => setShowAddSlot(false)}>
                      İptal
                    </button>
                  </div>
                )}

                {/* Toplu Ekleme Formu */}
                {showBulkForm && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <h4>📋 Haftalık Program Oluştur</h4>
                    <div className="form-grid">
                      <label>
                        Başlangıç Tarihi{' '}
                        <input
                          type="date"
                          value={bulkForm.startDate}
                          onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                        />
                      </label>
                      <label>
                        Bitiş Tarihi{' '}
                        <input
                          type="date"
                          value={bulkForm.endDate}
                          onChange={(e) => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                        />
                      </label>
                      <label>
                        Başlangıç Saati{' '}
                        <input
                          type="time"
                          value={bulkForm.startTime}
                          onChange={(e) => setBulkForm({ ...bulkForm, startTime: e.target.value })}
                        />
                      </label>
                      <label>
                        Bitiş Saati{' '}
                        <input
                          type="time"
                          value={bulkForm.endTime}
                          onChange={(e) => setBulkForm({ ...bulkForm, endTime: e.target.value })}
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        Çalışma Günleri
                        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          {DAYS.map((day, i) => (
                            <label
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.85rem',
                                color: 'var(--text)',
                              }}
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
                              />
                              {day}
                            </label>
                          ))}
                        </div>
                      </label>
                      <div className="form-actions">
                        <button
                          className="primary"
                          onClick={() => void bulkAdd()}
                          disabled={bulkSaving}
                        >
                          {bulkSaving ? 'Oluşturuluyor...' : 'Program Oluştur'}
                        </button>
                        <button className="secondary" onClick={() => setShowBulkForm(false)}>
                          İptal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Haftalık Takvim Görünümü */}
                {loadingSchedule ? (
                  <p className="muted">Yükleniyor...</p>
                ) : (
                  <div className="week-grid">
                    {weekDays.map((day) => {
                      const daySlots = schedule.filter((s) => s.date === day.date);
                      return (
                        <div key={day.date} className="day-column">
                          <div className="day-header">
                            <span className="day-name">{day.label}</span>
                            <span className="day-date">{day.short}</span>
                          </div>
                          <div className="day-slots">
                            {daySlots.length === 0 ? (
                              <span className="day-empty">Boş</span>
                            ) : (
                              daySlots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className={`time-slot-card ${slot.available ? '' : 'slot-unavailable'}`}
                                >
                                  <span className="slot-time">
                                    {slot.startTime.slice(0, 5)} - {slot.endTime.slice(0, 5)}
                                  </span>
                                  <button
                                    className="slot-delete"
                                    onClick={() => void deleteSlot(slot.id)}
                                    title="Sil"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MASÖZ AJANDASI ─── */}
      {activeTab === 'therapists' && !loading && (
        <div className="therapist-schedule-list">
          {therapists.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🧖</span>
              <p>Henüz masöz eklenmemiş</p>
            </div>
          ) : (
            therapists.map((t) => (
              <div key={t.id} className="card" style={{ marginBottom: 16 }}>
                <div className="therapist-schedule-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{t.name}</h3>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      {t.specialties?.join(', ') || 'Genel'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      className={t.active ? 'text-green' : 'text-red'}
                      style={{ fontSize: '0.8rem' }}
                    >
                      {t.active ? '● Aktif' : '● Pasif'}
                    </span>
                    {editingTherapist !== t.id ? (
                      <button className="btn-sm btn-outline" onClick={() => startEditTherapist(t)}>
                        ✏️ Düzenle
                      </button>
                    ) : (
                      <button
                        className="btn-sm btn-success"
                        onClick={() => void saveTherapistHours()}
                      >
                        💾 Kaydet
                      </button>
                    )}
                  </div>
                </div>

                {editingTherapist === t.id ? (
                  <div className="working-hours-edit">
                    {DAY_KEYS.map((key, i) => (
                      <div key={key} className="wh-row">
                        <span className="wh-day">{DAYS[i]}</span>
                        <input
                          type="text"
                          value={therapistHours[key] || ''}
                          onChange={(e) =>
                            setTherapistHours({ ...therapistHours, [key]: e.target.value })
                          }
                          placeholder="10:00-20:00 veya boş bırakın"
                          className="wh-input"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="working-hours-display">
                    {DAY_KEYS.map((key, i) => (
                      <div key={key} className="wh-row-display">
                        <span className="wh-day-display">{DAYS[i]}</span>
                        <span className={`wh-value ${t.workingHours?.[key] ? '' : 'wh-off'}`}>
                          {t.workingHours?.[key] || 'Kapalı'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
