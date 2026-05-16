import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { apiBaseUrl } from '../lib/config';

type TrainerRow = {
  id: string;
  userId: string;
  publicId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  offersSessionTypes: string[];
  avgRating: string;
  totalSessions: number;
  studentCount: number;
  todayLessons: number;
  todaySlots: number;
  monthSessions: number;
  lastActivity: string | null;
  createdAt: string;
};

type TrainerStats = {
  totalReservations: number;
  completedSessions: number;
  confirmedSessions: number;
  cancelledSessions: number;
  thisMonthSessions: number;
  totalSessions: number;
  avgRating: string;
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

const SPECIALIZATION_OPTIONS = [
  'Fonksiyonel Antrenman',
  'Kuvvet & Kondisyon',
  'Hipertrofi (Kas Gelişimi)',
  'Kilo Verme & Yağ Yakımı',
  'Pilates',
  'Yoga',
  'Kickboks & Boks',
  'CrossFit',
  'Rehabilitasyon & Postür',
  'Atletik Performans',
  'Beslenme Danışmanlığı',
  'Futbol Kondisyonu',
  'Yüzme',
  'Fitness & Personal Training',
  'Postür Analizi & Düzeltici Egzersizler',
];

const DAYS_LABELS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const WEEKDAY_NUMS = [1, 2, 3, 4, 5, 6, 0];

const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const h = 6 + i;
  return {
    start: `${h.toString().padStart(2, '0')}:00`,
    end: `${(h + 1).toString().padStart(2, '0')}:00`,
    label: `${h.toString().padStart(2, '0')}:00-${(h + 1).toString().padStart(2, '0')}:00`,
  };
});

type ViewMode = 'list' | 'schedule';

export function TrainersManagementPage({}: { embedded?: boolean } = {}) {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Ajanda state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [scheduleTrainer, setScheduleTrainer] = useState<TrainerRow | null>(null);
  const [schedule, setSchedule] = useState<AvailabilityRow[]>([]);

  // Randevu ekleme modal
  const [bookingModal, setBookingModal] = useState<{
    date: string;
    start: string;
    end: string;
  } | null>(null);
  const [members, setMembers] = useState<
    Array<{ id: string; firstName: string; lastName: string; email: string }>
  >([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);

  // Reschedule modal
  const [rescheduleModal, setRescheduleModal] = useState<{
    reservationId: string;
    currentDate: string;
  } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [cellPopup, setCellPopup] = useState<{
    date: string;
    start: string;
    end: string;
    hasSlot: boolean;
  } | null>(null);
  const [bulkForm, setBulkForm] = useState({
    startDate: '',
    endDate: '',
    weekdays: [1, 2, 3, 4, 5] as number[],
    startTime: '09:00',
    endTime: '18:00',
    slotDuration: 60,
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  // Stats
  const [selectedStats, setSelectedStats] = useState<{ id: string; stats: TrainerStats } | null>(
    null,
  );
  // Students modal
  const [studentsModal, setStudentsModal] = useState<{ trainerId: string; trainerName: string; students: Array<{ linkId: string; memberId: string; memberName: string | null; memberEmail: string | null; memberPhone: string | null; ptSessions: number }> } | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentMembers, setStudentMembers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);
  const [assigningStudent, setAssigningStudent] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    bio: '',
    specializations: [] as string[],
    certifications: '',
    offersSessionTypes: ['personal_training'] as string[],
    photoUrl: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<TrainerRow[]>('/admin/trainers');
      setTrainers(data.filter(t => t.offersSessionTypes?.includes('personal_training')));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Eğitmenler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // ─── Form İşlemleri ───────────────────────────────────────────────────────────
  function resetForm() {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      bio: '',
      specializations: [] as string[],
      certifications: '',
      offersSessionTypes: ['personal_training'],
      photoUrl: '',
    });
    setEditId(null);
  }

  function openEdit(t: TrainerRow) {
    setForm({
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone || '',
      password: '',
      bio: t.bio || '',
      specializations: ((t.specializations as string[]) || []) as string[],
      certifications: ((t.certifications as string[]) || []).join(', '),
      offersSessionTypes: t.offersSessionTypes || ['personal_training'],
      photoUrl: t.photoUrl || '',
    });
    setEditId(t.id);
    setShowForm(true);
    setStudentSearch('');
    // Load students + member list
    void loadStudents(t.id);
    apiJson<Array<{ id: string; firstName: string; lastName: string; email: string }>>('/admin/members?status=active').then(setStudentMembers).catch(() => {});
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const base = apiBaseUrl();
      const res = await fetch(`${base}/auth/upload-image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || 'Upload failed');
      }
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        const serverBase = base.replace('/api/v1', '');
        const fullUrl = body.url.startsWith('http') ? body.url : `${serverBase}${body.url}`;
        setForm((prev) => ({ ...prev, photoUrl: fullUrl }));
        setSuccess('✅ Fotoğraf yüklendi');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (e) {
      setError(`Fotoğraf yüklenemedi: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
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
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password || undefined,
        bio: form.bio || undefined,
        specializations: form.specializations,
        certifications: form.certifications
          ? form.certifications
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        offersSessionTypes: form.offersSessionTypes,
        photoUrl: form.photoUrl || undefined,
      };
      if (editId) {
        await apiJson(`/admin/trainers/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccess('✅ Eğitmen güncellendi');
      } else {
        if (!form.password) {
          setError('Şifre zorunludur');
          setSaving(false);
          return;
        }
        await apiJson('/admin/trainers', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('✅ Eğitmen eklendi');
      }
      setShowForm(false);
      resetForm();
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu eğitmeni silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await apiJson(`/admin/trainers/${id}`, { method: 'DELETE' });
      await load();
      setSuccess('✅ Eğitmen silindi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Silme başarısız');
    }
  }

  async function loadStudents(trainerId: string) {
    try {
      const trainer = trainers.find(t => t.id === trainerId);
      const students = await apiJson<Array<{ linkId: string; memberId: string; memberName: string | null; memberEmail: string | null; memberPhone: string | null; ptSessions: number }>>(`/admin/trainers/${trainerId}/students`);
      setStudentsModal({ trainerId, trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : '', students });
    } catch {
      const trainer = trainers.find(t => t.id === trainerId);
      setStudentsModal({ trainerId, trainerName: trainer ? `${trainer.firstName} ${trainer.lastName}` : '', students: [] });
    }
  }

  async function loadStats(trainerId: string) {
    try {
      const stats = await apiJson<TrainerStats>(`/admin/trainers/${trainerId}/stats`);
      setSelectedStats((prev) => (prev?.id === trainerId ? null : { id: trainerId, stats }));
    } catch {
      /* ignore */
    }
  }

  // ─── Ajanda İşlemleri ─────────────────────────────────────────────────────────
  function openSchedule(t: TrainerRow) {
    setScheduleTrainer(t);
    setViewMode('schedule');
    setWeekOffset(0);
    void loadTrainerSchedule(t.id, 0);
  }

  function closeSchedule() {
    setViewMode('list');
    setScheduleTrainer(null);
    setSchedule([]);
  }

  function getWeekRange(offset: number) {
    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diffToMonday + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
      label: `${monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${sunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`,
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
      return { date: d.toISOString().slice(0, 10), label: DAYS_LABELS[i], dayNum: d.getDate() };
    });
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

  function changeWeek(dir: number) {
    const next = weekOffset + dir;
    setWeekOffset(next);
    if (scheduleTrainer) void loadTrainerSchedule(scheduleTrainer.id, next);
  }

  async function toggleSlot(date: string, startTime: string, endTime: string) {
    if (!scheduleTrainer) return;
    const existing = schedule.find(
      (s) => s.date.slice(0, 10) === date && s.startTime.slice(0, 5) === startTime,
    );
    if (existing) {
      await apiJson(`/admin/trainers/${scheduleTrainer.id}/schedule/${existing.id}`, {
        method: 'DELETE',
      });
    } else {
      await apiJson(`/admin/trainers/${scheduleTrainer.id}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ date, startTime, endTime }),
      });
    }
    void loadTrainerSchedule(scheduleTrainer.id, weekOffset);
  }

  async function cancelReservation(reservationId: string) {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/admin/reservations/${reservationId}/cancel`, { method: 'POST' });
      setSuccess('✅ Rezervasyon iptal edildi');
      if (scheduleTrainer) void loadTrainerSchedule(scheduleTrainer.id, weekOffset);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İptal başarısız');
    }
  }

  async function openBookingModal(date: string, start: string, end: string) {
    setBookingModal({ date, start, end });
    setCellPopup(null);
    // Üye listesini yükle
    try {
      const data = await apiJson<
        Array<{ id: string; firstName: string; lastName: string; email: string }>
      >('/admin/members?status=active');
      setMembers(data);
    } catch {
      setMembers([]);
    }
  }

  async function createBooking() {
    if (!scheduleTrainer || !bookingModal || !selectedMemberId) return;
    setBookingSaving(true);
    try {
      await apiJson('/admin/reservations/create', {
        method: 'POST',
        body: JSON.stringify({
          trainerId: scheduleTrainer.id,
          userId: selectedMemberId,
          date: bookingModal.date,
          startTime: bookingModal.start,
          endTime: bookingModal.end,
        }),
      });
      setSuccess('✅ Randevu oluşturuldu');
      setBookingModal(null);
      setSelectedMemberId('');
      void loadTrainerSchedule(scheduleTrainer.id, weekOffset);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Randevu oluşturulamadı');
    } finally {
      setBookingSaving(false);
    }
  }

  async function rescheduleReservation() {
    if (!rescheduleModal || !rescheduleDate) return;
    try {
      const endHour = parseInt(rescheduleTime.split(':')[0]) + 1;
      await apiJson(`/admin/reservations/${rescheduleModal.reservationId}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({
          newDate: rescheduleDate,
          newStartTime: rescheduleTime,
          newEndTime: `${endHour.toString().padStart(2, '0')}:00`,
        }),
      });
      setSuccess('✅ Randevu taşındı');
      setRescheduleModal(null);
      if (scheduleTrainer) void loadTrainerSchedule(scheduleTrainer.id, weekOffset);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Taşıma başarısız');
    }
  }

  async function clearDay(date: string) {
    if (!scheduleTrainer) return;
    if (!confirm(`${date} tarihindeki tüm saatleri silmek istiyor musunuz?`)) return;
    await apiJson(`/admin/trainers/${scheduleTrainer.id}/schedule-day?date=${date}`, {
      method: 'DELETE',
    });
    void loadTrainerSchedule(scheduleTrainer.id, weekOffset);
  }

  async function bulkAdd() {
    if (!scheduleTrainer) return;
    setBulkSaving(true);
    try {
      const startH = parseInt(bulkForm.startTime.split(':')[0]);
      const endH = parseInt(bulkForm.endTime.split(':')[0]);
      let totalCreated = 0;
      for (let h = startH; h < endH; h += bulkForm.slotDuration / 60) {
        const slotStart = `${Math.floor(h).toString().padStart(2, '0')}:00`;
        const slotEnd = `${Math.floor(h + bulkForm.slotDuration / 60)
          .toString()
          .padStart(2, '0')}:00`;
        const res = await apiJson<{ created: number }>(
          `/admin/trainers/${scheduleTrainer.id}/schedule/bulk`,
          {
            method: 'POST',
            body: JSON.stringify({ ...bulkForm, startTime: slotStart, endTime: slotEnd }),
          },
        );
        totalCreated += res.created;
      }
      setSuccess(`✅ ${totalCreated} saat dilimi oluşturuldu`);
      setShowBulkForm(false);
      void loadTrainerSchedule(scheduleTrainer.id, weekOffset);
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
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  // ─── AJANDA GÖRÜNÜMÜ ──────────────────────────────────────────────────────────
  if (viewMode === 'schedule' && scheduleTrainer) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <button className="btn-back" onClick={closeSchedule}>
              ← Eğitmenlere Dön
            </button>
            <h1 className="dashboard-title">
              {scheduleTrainer.firstName} {scheduleTrainer.lastName} — Ajanda
            </h1>
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

        {/* Toplu Program Formu */}
        {showBulkForm && (
          <div className="bulk-form-card">
            <div className="bulk-form-header">
              <h4>📋 Toplu Çalışma Programı Oluştur</h4>
              <p className="muted">
                Tarih aralığı ve günleri seçin, otomatik saat dilimleri oluşturulsun.
              </p>
            </div>
            <div className="form-grid">
              <label>
                Başlangıç Tarihi *{' '}
                <input
                  type="date"
                  value={bulkForm.startDate}
                  onChange={(e) => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                />
              </label>
              <label>
                Bitiş Tarihi *{' '}
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
                Çalışma Günleri
                <div className="weekday-selector">
                  {DAYS_LABELS.map((day, i) => (
                    <label
                      key={i}
                      className={`weekday-chip ${bulkForm.weekdays.includes(WEEKDAY_NUMS[i]) ? 'weekday-chip-active' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={bulkForm.weekdays.includes(WEEKDAY_NUMS[i])}
                        onChange={(e) => {
                          const num = WEEKDAY_NUMS[i];
                          setBulkForm({
                            ...bulkForm,
                            weekdays: e.target.checked
                              ? [...bulkForm.weekdays, num]
                              : bulkForm.weekdays.filter((w) => w !== num),
                          });
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

        {/* Hafta Navigasyonu */}
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
              void loadTrainerSchedule(scheduleTrainer.id, 0);
            }}
          >
            Bugün
          </button>
        </div>

        {/* Takvim Grid */}
        {loadingSchedule ? (
          <p className="muted">Yükleniyor...</p>
        ) : (
          <div className="calendar-grid">
            <div className="calendar-header-row">
              <div className="calendar-time-col">Saat</div>
              {weekDays.map((day) => {
                const today = new Date().toISOString().slice(0, 10);
                const isPast = day.date < today;
                const isToday = day.date === today;
                return (
                  <div
                    key={day.date}
                    className={`calendar-day-col ${isPast ? 'cal-day-past' : ''} ${isToday ? 'cal-day-today' : ''}`}
                  >
                    <span className="cal-day-name">{day.label.slice(0, 3)}</span>
                    <span className="cal-day-num">{day.dayNum}</span>
                    {isToday && <span className="cal-today-badge">Bugün</span>}
                    {!isPast && schedule.filter((s) => s.date === day.date).length > 0 && (
                      <button
                        className="cal-clear-btn"
                        onClick={() => void clearDay(day.date)}
                        title="Günü temizle"
                      >
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
                  const slotHour = parseInt(slot.start.split(':')[0]);
                  const isPastDay = day.date < today;
                  const isPastSlot = day.date === today && slotHour <= currentHour;
                  const isDisabled = isPastDay || isPastSlot;

                  const slotData = schedule.find(
                    (s) =>
                      s.date.slice(0, 10) === day.date && s.startTime.slice(0, 5) === slot.start,
                  );
                  const hasSlot = !!slotData;
                  const isBooked = slotData?.booked || false;
                  const isPopupTarget =
                    cellPopup?.date === day.date && cellPopup?.start === slot.start;

                  return (
                    <div
                      key={`${day.date}-${slot.start}`}
                      className={`calendar-cell ${isDisabled ? 'calendar-cell-disabled' : ''} ${hasSlot ? (isBooked ? 'calendar-cell-booked' : 'calendar-cell-active') : ''} ${isPopupTarget ? 'calendar-cell-selected' : ''}`}
                      onClick={() => {
                        if (isDisabled) return;
                        setCellPopup(
                          isPopupTarget
                            ? null
                            : { date: day.date, start: slot.start, end: slot.end, hasSlot },
                        );
                      }}
                    >
                      {isDisabled && hasSlot && isBooked && (
                        <span className="cell-booked-past">●</span>
                      )}
                      {isDisabled && hasSlot && !isBooked && (
                        <span className="cell-check-past">✓</span>
                      )}
                      {!isDisabled && isBooked && (
                        <span className="cell-booked-name">
                          {slotData?.bookedBy?.firstName} {slotData?.bookedBy?.lastName?.charAt(0)}.
                        </span>
                      )}
                      {!isDisabled && hasSlot && !isBooked && (
                        <span className="cell-check">Müsait</span>
                      )}
                      {isPopupTarget && !isDisabled && (
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
                                <button
                                  className="cell-popup-btn cell-popup-cancel"
                                  onClick={() => {
                                    void cancelReservation(slotData!.bookedBy!.reservationId);
                                    setCellPopup(null);
                                  }}
                                >
                                  ❌ Rezervasyonu İptal Et
                                </button>
                                <button
                                  className="cell-popup-btn cell-popup-reschedule"
                                  onClick={() => {
                                    setRescheduleModal({
                                      reservationId: slotData!.bookedBy!.reservationId,
                                      currentDate: day.date,
                                    });
                                    setCellPopup(null);
                                  }}
                                >
                                  🔄 İleri Tarihe Al
                                </button>
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
                                <button
                                  className="cell-popup-btn cell-popup-book"
                                  onClick={() =>
                                    void openBookingModal(day.date, slot.start, slot.end)
                                  }
                                >
                                  📝 Üye Adına Randevu Ekle
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
            <span className="legend-dot legend-green"></span> Müsait (boş)
          </span>
          <span>
            <span className="legend-dot legend-blue"></span> Dolu (randevu alınmış)
          </span>
          <span>
            <span className="legend-dot legend-gray"></span> Geçmiş / Kapalı
          </span>
          <span>
            <span className="legend-dot legend-today"></span> Bugün
          </span>
        </div>

        {/* Üye Adına Randevu Ekleme Modal */}
        {bookingModal && (
          <div className="modal-overlay" onClick={() => setBookingModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📝 Üye Adına Randevu Ekle</h3>
                <button className="modal-close" onClick={() => setBookingModal(null)}>
                  ✕
                </button>
              </div>
              <p className="muted">
                {bookingModal.date} · {bookingModal.start}-{bookingModal.end} ·{' '}
                {scheduleTrainer?.firstName} {scheduleTrainer?.lastName}
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
                  <option value="">Üye seçin...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} — {m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  className="primary"
                  onClick={() => void createBooking()}
                  disabled={!selectedMemberId || bookingSaving}
                >
                  {bookingSaving ? '⏳...' : '✓ Randevu Oluştur'}
                </button>
                <button className="secondary" onClick={() => setBookingModal(null)}>
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Randevu Taşıma Modal */}
        {rescheduleModal && (
          <div className="modal-overlay" onClick={() => setRescheduleModal(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🔄 Randevuyu İleri Tarihe Al</h3>
                <button className="modal-close" onClick={() => setRescheduleModal(null)}>
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: '0.85rem',
                      color: 'var(--muted)',
                    }}
                  >
                    Yeni Tarih *
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: 4,
                      fontSize: '0.85rem',
                      color: 'var(--muted)',
                    }}
                  >
                    Yeni Saat *
                  </label>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  >
                    {TIME_SLOTS.map((s) => (
                      <option key={s.start} value={s.start}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
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
      </div>
    );
  }

  // ─── LİSTE GÖRÜNÜMÜ ──────────────────────────────────────────────────────────
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Eğitmen Yönetimi</h1>
          <p className="dashboard-subtitle">Eğitmenleri ekle, düzenle, ajandalarını yönet</p>
        </div>
        <button
          className="btn-primary-lg"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Yeni Eğitmen Ekle
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editId ? '✏️ Eğitmen Düzenle' : '➕ Yeni Eğitmen Ekle'}</h3>
          {editId && (() => { const tr = trainers.find(t => t.id === editId); return tr?.publicId ? <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace', margin: '-4px 0 12px', padding: '6px 12px', background: 'rgba(37,99,235,0.06)', borderRadius: 8, display: 'inline-block' }}>🆔 {tr.publicId}</div> : null; })()}
          {/* Fotoğraf - Kare */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', flexShrink: 0 }}>
              {form.photoUrl ? <img src={form.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '1.5rem', color: 'var(--muted)' }}>📷</span>}
            </div>
            <div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); }} disabled={uploading} style={{ fontSize: '0.78rem' }} />
              {uploading && <span className="muted" style={{ fontSize: '0.72rem' }}>⏳ Yükleniyor...</span>}
              <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--muted)' }}>Kare fotoğraf önerilir (min 200x200)</p>
            </div>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>
              Ad *{' '}
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Soyad *{' '}
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              E-posta *{' '}
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={!!editId}
              />
            </label>
            <label>
              Telefon{' '}
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
              />
            </label>
            {!editId && (
              <label>
                Şifre *{' '}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editId}
                  minLength={6}
                />
              </label>
            )}
            <label>
              Biyografi{' '}
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={5}
                placeholder="Eğitmen hakkında..."
                style={{ resize: 'vertical', minHeight: 100 }}
              />
            </label>
            <label>
              Sertifikalar{' '}
              <input
                value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                placeholder="ACE, NASM"
              />
            </label>
            <label>
              Uzmanlık Alanları
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {SPECIALIZATION_OPTIONS.map(spec => {
                  const checked = (form.specializations as string[]).includes(spec);
                  return (
                    <span key={spec} onClick={() => { const c = form.specializations as string[]; setForm({ ...form, specializations: checked ? c.filter(s => s !== spec) : [...c, spec] }); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: 20, border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`, background: checked ? 'rgba(37,99,235,0.08)' : '#fff', cursor: 'pointer', fontSize: '0.76rem', fontWeight: checked ? 600 : 400, color: checked ? 'var(--accent)' : 'var(--text)' }}>
                      {checked ? '✓' : '○'} {spec}
                    </span>
                  );
                })}
              </div>
            </label>
            {/* Öğrenci Yönetimi (düzenleme modunda) */}
            {editId && studentsModal && (
              <div style={{ marginTop: '1rem', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: 12, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>👥 Öğrenciler</h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 8, background: 'var(--surface)', color: 'var(--muted)' }}>{studentsModal.students.length} kayıtlı</span>
                </div>

                {/* Mevcut Öğrenciler */}
                {studentsModal.students.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {studentsModal.students.map(s => (
                      <div key={s.linkId} style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', gap: '0.75rem' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>
                          {s.memberName?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{s.memberName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{s.memberEmail}{s.memberPhone ? ` · ${s.memberPhone}` : ''}</div>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: s.ptSessions > 0 ? '#dcfce7' : '#fee2e2', color: s.ptSessions > 0 ? '#166534' : '#991b1b', whiteSpace: 'nowrap' }}>
                          {s.ptSessions > 0 ? `🏋️ ${s.ptSessions} seans` : '⚠️ Paket yok'}
                        </span>
                        <button type="button" style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if (confirm(`${s.memberName} çıkarılsın mı?`)) { void apiJson(`/admin/members/${s.memberId}/remove-trainer`, { method: 'POST', body: JSON.stringify({ trainerId: editId }) }).then(() => { void loadStudents(editId!); void load(); }); } }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {studentsModal.students.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 1rem', padding: '0.75rem', background: 'var(--surface)', borderRadius: 8, textAlign: 'center' }}>Henüz öğrenci atanmamış. Aşağıdan üye arayarak atayabilirsiniz.</p>
                )}

                {/* Öğrenci Ata */}
                <div style={{ padding: '0.75rem', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>+ Yeni Öğrenci Ata</label>
                  <input type="text" className="form-input" style={{ width: '100%', fontSize: '0.82rem' }} placeholder="Üye adı veya e-posta ile ara..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  {studentSearch.length >= 2 && (
                    <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginTop: '0.4rem', background: '#fff' }}>
                      {studentMembers
                        .filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(studentSearch.toLowerCase()))
                        .filter(m => !studentsModal.students.some(s => s.memberId === m.id))
                        .slice(0, 6)
                        .map(m => (
                          <div key={m.id} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={async () => {
                            setAssigningStudent(true);
                            try {
                              await apiJson(`/admin/members/${m.id}/assign-trainer`, { method: 'POST', body: JSON.stringify({ trainerId: editId }) });
                              setStudentSearch('');
                              void loadStudents(editId!);
                              void load();
                            } catch (err) { alert(err instanceof Error ? err.message : 'Atama başarısız'); }
                            finally { setAssigningStudent(false); }
                          }}>
                            <div><strong>{m.firstName} {m.lastName}</strong><span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 6 }}>{m.email}</span></div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)' }}>+ Ata</span>
                          </div>
                        ))
                      }
                      {studentMembers.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(studentSearch.toLowerCase())).filter(m => !studentsModal.students.some(s => s.memberId === m.id)).length === 0 && (
                        <p style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>Eşleşen üye bulunamadı</p>
                      )}
                    </div>
                  )}
                  {assigningStudent && <p style={{ fontSize: '0.72rem', color: 'var(--accent)', margin: '0.4rem 0 0' }}>⏳ Atanıyor...</p>}
                </div>
              </div>
            )}
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
              </button>
              {editId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Yeni şifre (min 6 karakter)"
                    id="trainer-new-password"
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', width: 180 }}
                  />
                  <button
                    type="button"
                    className="secondary"
                    style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e', whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      const input = document.getElementById('trainer-new-password') as HTMLInputElement;
                      const pw = input?.value?.trim();
                      if (!pw || pw.length < 6) { alert('Şifre en az 6 karakter olmalıdır'); return; }
                      if (!confirm('Eğitmenin şifresi değiştirilecek. Devam edilsin mi?')) return;
                      try {
                        const trainer = trainers.find(t => t.id === editId);
                        if (!trainer) return;
                        await apiJson(`/admin/trainers/${trainer.userId}/change-password`, { method: 'POST', body: JSON.stringify({ password: pw }) });
                        alert('✅ Şifre değiştirildi!');
                        input.value = '';
                      } catch (e) {
                        alert(e instanceof ApiError ? e.message : 'Şifre değiştirme başarısız');
                      }
                    }}
                  >
                    🔑 Şifreyi Değiştir
                  </button>
                </div>
              )}
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

      {/* Eğitmen Kartları */}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : trainers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏋️</span>
          <p>Henüz eğitmen eklenmemiş</p>
        </div>
      ) : (
        <div className="trainers-grid">
          {trainers.map((t) => (
            <div key={t.id} className="trainer-card" onClick={() => openEdit(t)} style={{ cursor: 'pointer' }}>
              {/* Bugün bilgisi ribbon */}
              {t.todayLessons > 0 && <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#dbeafe', color: '#1e40af' }}>📅 Bugün {t.todayLessons} ders</div>}

              {/* Header: Avatar + Name */}
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <div className="trainer-avatar-lg" style={{ margin: '0 auto 8px' }}>
                  {t.photoUrl ? <img src={t.photoUrl} alt={t.firstName} /> : <span>{t.firstName[0]}{t.lastName[0]}</span>}
                </div>
                <h3 style={{ margin: '0 0 2px', fontSize: '0.92rem' }}>{t.firstName} {t.lastName}</h3>
                <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>{t.phone || t.email}</div>
              </div>

              {/* Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.25rem', textAlign: 'center', margin: '8px 0', padding: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div><div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent)' }}>{t.studentCount}</div><div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Öğrenci</div></div>
                <div><div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#059669' }}>{t.monthSessions}</div><div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Bu Ay</div></div>
                <div><div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#d97706' }}>⭐{Number(t.avgRating).toFixed(1)}</div><div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Puan</div></div>
              </div>

              {/* Doluluk + Son aktivite */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--muted)', margin: '4px 0 8px' }}>
                <span>{t.todaySlots > 0 ? `Bugün: ${t.todayLessons}/${t.todaySlots} dolu` : 'Bugün slot yok'}</span>
                <span>{t.lastActivity ? `Son: ${new Date(t.lastActivity).toLocaleDateString('tr-TR')}` : 'Henüz ders yok'}</span>
              </div>

              {/* Tags */}
              <div className="trainer-tags" style={{ justifyContent: 'center', marginBottom: 6 }}>
                {t.specializations && (t.specializations as string[]).slice(0, 3).map((s, i) => (
                  <span key={i} className="spec-tag">{s}</span>
                ))}
              </div>

              {/* Actions */}
              <div className="trainer-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn-sm btn-primary" onClick={() => openSchedule(t)}>🗓️ Ajanda</button>
                <button className="btn-sm btn-outline" onClick={() => void loadStats(t.id)}>📊</button>
                <button className="btn-sm btn-danger" onClick={() => void handleDelete(t.id)}>🗑</button>
              </div>

              {/* Stats Panel */}
              {selectedStats?.id === t.id && (
                <div className="trainer-detail-panel" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', textAlign: 'center' }}>
                    <div><div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#059669' }}>{selectedStats.stats.completedSessions}</div><div style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Biten</div></div>
                    <div><div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>{selectedStats.stats.confirmedSessions}</div><div style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Onaylı</div></div>
                    <div><div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#dc2626' }}>{selectedStats.stats.cancelledSessions}</div><div style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>İptal</div></div>
                    <div><div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#d97706' }}>{selectedStats.stats.thisMonthSessions}</div><div style={{ fontSize: '0.58rem', color: 'var(--muted)' }}>Bu Ay</div></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
