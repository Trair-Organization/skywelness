import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type Availability = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
};
type Lesson = {
  id: string;
  startTime: string;
  endTime: string;
  studentName: string;
  studentId: string;
  type: string;
  status: string;
};
type CalendarResponse = { availabilities: Availability[]; lessons: Lesson[] };
type Student = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl?: string | null;
  linked?: boolean;
  lastLessonAt?: string | null;
};

type CellState =
  | { kind: 'empty' }
  | { kind: 'available'; slot: Availability }
  | { kind: 'booked'; slot: Availability | null; lesson: Lesson };

type ActionMode =
  | { mode: 'menu'; cell: CellState; hour: string }
  | { mode: 'book'; cell: CellState; hour: string }
  | { mode: 'bulkSlot' }
  | { mode: 'reschedule'; lesson: Lesson }
  | null;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the Monday of the week containing the given date (ISO week). */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Pzr'];

type ViewMode = 'daily' | 'weekly';

export function TrainerAgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [date, setDate] = useState<string>(todayISO());
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [action, setAction] = useState<ActionMode>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkStartHour, setBulkStartHour] = useState(9);
  const [bulkEndHour, setBulkEndHour] = useState(18);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleHour, setRescheduleHour] = useState('09');
  const [dragLesson, setDragLesson] = useState<Lesson | null>(null);
  const [dropTargetHour, setDropTargetHour] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fromDate = viewMode === 'weekly' ? getWeekStart(date) : date;
      const toDate = viewMode === 'weekly' ? addDays(getWeekStart(date), 6) : date;
      const [cal, members] = await Promise.all([
        apiJson<CalendarResponse>(
          `/trainer-panel/calendar?from=${fromDate}T00:00:00Z&to=${toDate}T23:59:59Z`,
        ),
        apiJson<Student[]>('/trainer-panel/available-members'),
      ]);
      setData(cal);
      setStudents(members);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [date, viewMode]);

  useEffect(() => {
    void load();
  }, [load]);

  function navigateDate(off: number) {
    const step = viewMode === 'weekly' ? off * 7 : off;
    setDate(addDays(date, step));
  }

  function flash(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 2500);
  }

  function getCellStateForDate(targetDate: string, hour: string): CellState {
    if (!data) return { kind: 'empty' };
    const slot = data.availabilities.find(
      (a) => a.date === targetDate && a.startTime.slice(0, 5) === hour,
    );
    const lesson = data.lessons.find((l) => {
      const t = new Date(l.startTime).toISOString().slice(11, 16);
      const d = new Date(l.startTime).toISOString().slice(0, 10);
      return d === targetDate && t === hour;
    });
    if (lesson) return { kind: 'booked', slot: slot ?? null, lesson };
    if (slot) return { kind: 'available', slot };
    return { kind: 'empty' };
  }

  function openCellMenu(hour: string, targetDate?: string) {
    if (targetDate && targetDate !== date) {
      setDate(targetDate);
    }
    const cell = getCellStateForDate(targetDate ?? date, hour);
    setAction({ mode: 'menu', cell, hour });
    setSelectedStudent(null);
    setStudentSearch('');
  }

  function close() {
    setAction(null);
    setSelectedStudent(null);
    setStudentSearch('');
  }

  async function handleAddSlot() {
    if (!action || action.mode !== 'menu') return;
    setActionLoading(true);
    try {
      const endHour = `${String(parseInt(action.hour) + 1).padStart(2, '0')}:00`;
      await apiJson('/trainer-panel/availability', {
        method: 'POST',
        body: JSON.stringify({ date, startTime: action.hour, endTime: endHour }),
      });
      close();
      await load();
      flash('✅ Slot eklendi');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteSlot() {
    if (!action || action.mode !== 'menu' || action.cell.kind !== 'available') return;
    if (!confirm('Slot silinecek?')) return;
    setActionLoading(true);
    try {
      await apiJson(`/trainer-panel/availability/${action.cell.slot.id}`, { method: 'DELETE' });
      close();
      await load();
      flash('✅ Slot silindi');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBookSlot() {
    if (!action || action.mode !== 'book' || !selectedStudent) return;
    setActionLoading(true);
    try {
      const endHour = `${String(parseInt(action.hour) + 1).padStart(2, '0')}:00`;
      await apiJson('/trainer-panel/lessons/direct', {
        method: 'POST',
        body: JSON.stringify({
          studentUserId: selectedStudent.userId,
          date,
          startTime: action.hour,
          endTime: endHour,
        }),
      });
      close();
      await load();
      flash('✅ Ders oluşturuldu');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelLesson() {
    if (!action || action.mode !== 'menu' || action.cell.kind !== 'booked') return;
    if (!confirm('Ders iptal edilecek?')) return;
    setActionLoading(true);
    try {
      await apiJson(`/trainer-panel/lessons/${action.cell.lesson.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      close();
      await load();
      flash('✅ Ders iptal edildi');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCompleteLesson() {
    if (!action || action.mode !== 'menu' || action.cell.kind !== 'booked') return;
    setActionLoading(true);
    try {
      await apiJson(`/trainer-panel/lessons/${action.cell.lesson.id}/complete`, {
        method: 'POST',
      });
      close();
      await load();
      flash('✅ Tamamlandı');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemindLesson() {
    if (!action || action.mode !== 'menu' || action.cell.kind !== 'booked') return;
    setActionLoading(true);
    try {
      await apiJson(`/trainer-panel/lessons/${action.cell.lesson.id}/remind`, { method: 'POST' });
      flash('📱 Hatırlatma gönderildi');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRescheduleSubmit() {
    if (!action || action.mode !== 'reschedule' || !rescheduleDate) return;
    setActionLoading(true);
    try {
      const endHour = `${String(parseInt(rescheduleHour) + 1).padStart(2, '0')}:00`;
      await apiJson(`/trainer-panel/lessons/${action.lesson.id}/reschedule-direct`, {
        method: 'POST',
        body: JSON.stringify({
          newDate: rescheduleDate,
          newStartTime: `${rescheduleHour}:00`,
          newEndTime: endHour,
        }),
      });
      close();
      await load();
      flash('✅ Ders taşındı');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkAddSlots() {
    setActionLoading(true);
    try {
      const promises = [];
      for (let h = bulkStartHour; h < bulkEndHour; h++) {
        promises.push(
          apiJson('/trainer-panel/availability', {
            method: 'POST',
            body: JSON.stringify({
              date,
              startTime: `${String(h).padStart(2, '0')}:00`,
              endTime: `${String(h + 1).padStart(2, '0')}:00`,
            }),
          }).catch(() => null),
        );
      }
      await Promise.all(promises);
      close();
      await load();
      flash(`✅ ${bulkEndHour - bulkStartHour} slot oluşturuldu`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearDay() {
    if (!confirm(`${date} tüm slotlar silinecek?`)) return;
    try {
      await apiJson(`/trainer-panel/schedule-day?date=${date}`, { method: 'DELETE' });
      await load();
      flash('✅ Gün temizlendi');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hata');
    }
  }

  // Drag & drop reschedule
  async function handleDrop(targetHour: string) {
    if (!dragLesson) return;
    const sourceHour = new Date(dragLesson.startTime).toISOString().slice(11, 16);
    const sourceDate = new Date(dragLesson.startTime).toISOString().slice(0, 10);
    if (sourceDate === date && sourceHour === targetHour) {
      setDragLesson(null);
      setDropTargetHour(null);
      return;
    }
    try {
      const endHour = `${String(parseInt(targetHour) + 1).padStart(2, '0')}:00`;
      await apiJson(`/trainer-panel/lessons/${dragLesson.id}/reschedule-direct`, {
        method: 'POST',
        body: JSON.stringify({
          newDate: date,
          newStartTime: targetHour,
          newEndTime: endHour,
        }),
      });
      await load();
      flash('✅ Ders taşındı');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Taşıma başarısız');
    } finally {
      setDragLesson(null);
      setDropTargetHour(null);
    }
  }

  // Stats — week aware
  const weekDates = (() => {
    if (viewMode !== 'weekly') return [date];
    const start = getWeekStart(date);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  })();

  const allHours = data
    ? data.availabilities
        .filter((a) => weekDates.includes(a.date))
        .map((a) => parseInt(a.startTime))
    : [];
  const minHour = allHours.length > 0 ? Math.min(...allHours) : 9;
  const maxHour = allHours.length > 0 ? Math.max(...allHours) + 1 : 22;
  const hours = Array.from({ length: maxHour - minHour }, (_, i) =>
    `${String(i + minHour).padStart(2, '0')}:00`,
  );
  const totalSlots = allHours.length;
  const todayLessons = data
    ? data.lessons.filter((l) =>
        weekDates.includes(new Date(l.startTime).toISOString().slice(0, 10)),
      ).length
    : 0;
  const occupancyPct = totalSlots > 0 ? Math.round((todayLessons / totalSlots) * 100) : 0;

  const filteredStudents =
    studentSearch.length > 0
      ? students
          .filter((s) =>
            `${s.firstName} ${s.lastName} ${s.email}`
              .toLowerCase()
              .includes(studentSearch.toLowerCase()),
          )
          .slice(0, 10)
      : students.slice(0, 10);

  return (
    <div className="trainer-panel">
      <div className="trainer-agenda-header">
        <div>
          <h1 className="trainer-agenda-title">📅 Ajandam</h1>
          <p className="trainer-agenda-sub">
            Çalışma saatlerini ayarla, ders oluştur, randevuları yönet.
          </p>
        </div>
      </div>

      {error && <div className="trainer-error-banner">⚠️ {error}</div>}
      {success && <div className="trainer-success-banner">{success}</div>}

      <div className="agenda-toolbar">
        <div className="agenda-nav">
          <button className="btn-sm btn-outline" onClick={() => navigateDate(-1)}>
            ‹
          </button>
          <button className="btn-sm btn-outline" onClick={() => setDate(todayISO())}>
            Bugün
          </button>
          <button className="btn-sm btn-outline" onClick={() => navigateDate(1)}>
            ›
          </button>
          <span className="agenda-date-label">
            {viewMode === 'weekly'
              ? `${new Date(getWeekStart(date)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${new Date(addDays(getWeekStart(date), 6)).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : new Date(date).toLocaleDateString('tr-TR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
          </span>
        </div>
        <div className="agenda-actions">
          <div className="view-toggle">
            <button
              className={`btn-sm ${viewMode === 'daily' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('daily')}
            >
              Günlük
            </button>
            <button
              className={`btn-sm ${viewMode === 'weekly' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('weekly')}
            >
              Haftalık
            </button>
          </div>
          <button
            className="btn-sm btn-primary"
            onClick={() => setAction({ mode: 'bulkSlot' })}
          >
            🕐 Çalışma Saatleri
          </button>
          {viewMode === 'daily' && totalSlots > 0 && (
            <button className="btn-sm btn-outline" onClick={() => void handleClearDay()}>
              ✕ Günü Kapat
            </button>
          )}
        </div>
      </div>

      {!loading && totalSlots > 0 && (
        <div className="agenda-stats-bar">
          <div className="agenda-stat">
            <span className="agenda-stat-value">{todayLessons}</span>
            <span className="agenda-stat-label">Ders</span>
          </div>
          <div className="agenda-stat">
            <span className="agenda-stat-value">{totalSlots - todayLessons}</span>
            <span className="agenda-stat-label">Müsait</span>
          </div>
          <div className="agenda-stat">
            <span className="agenda-stat-value">{totalSlots}</span>
            <span className="agenda-stat-label">Toplam</span>
          </div>
          <div className="agenda-stat">
            <span
              className="agenda-stat-value"
              style={{
                color:
                  occupancyPct >= 80 ? '#059669' : occupancyPct >= 50 ? '#d97706' : '#64748b',
              }}
            >
              %{occupancyPct}
            </span>
            <span className="agenda-stat-label">Doluluk</span>
          </div>
        </div>
      )}

      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && totalSlots === 0 && (
        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
          <span className="empty-icon">📅</span>
          <p>
            {viewMode === 'weekly'
              ? 'Bu hafta için slot oluşturulmamış.'
              : 'Bugün için slot oluşturulmamış.'}
          </p>
          <button
            className="btn-sm btn-primary"
            onClick={() => setAction({ mode: 'bulkSlot' })}
            style={{ marginTop: '0.75rem' }}
          >
            🕐 Çalışma saatleri ekle
          </button>
        </div>
      )}

      {!loading && totalSlots > 0 && (
        <div className="agenda-grid-wrapper">
          <table className="agenda-table">
            <thead>
              <tr>
                <th className="agenda-th-hour">Saat</th>
                {viewMode === 'weekly' ? (
                  weekDates.map((d) => {
                    const dayDate = new Date(d + 'T12:00:00');
                    const isCurrentDay = d === todayISO();
                    return (
                      <th key={d} className="agenda-th-therapist">
                        <div>
                          <div
                            className="agenda-therapist-name"
                            style={{ color: isCurrentDay ? 'var(--accent)' : undefined }}
                          >
                            {WEEKDAY_LABELS[(dayDate.getDay() + 6) % 7]}
                          </div>
                          <div className="agenda-therapist-stat">
                            {dayDate.getDate()}{' '}
                            {dayDate.toLocaleDateString('tr-TR', { month: 'short' })}
                          </div>
                        </div>
                      </th>
                    );
                  })
                ) : (
                  <th className="agenda-th-therapist">
                    <div>
                      <div className="agenda-therapist-name">📅 Ajandam</div>
                      <div className="agenda-therapist-stat">
                        {todayLessons}/{totalSlots} dolu
                      </div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => {
                const hourInt = parseInt(h);
                const nH = `${String(hourInt + 1).padStart(2, '0')}:00`;

                return (
                  <tr key={h}>
                    <td className="agenda-td-hour">
                      {h}–{nH}
                    </td>
                    {(viewMode === 'weekly' ? weekDates : [date]).map((cellDate) => {
                      const cell = getCellStateForDate(cellDate, h);
                      const cellNow = new Date();
                      const isPastDay = cellDate < todayISO();
                      const isPast =
                        isPastDay ||
                        (cellDate === todayISO() && hourInt <= cellNow.getHours());
                      const dropKey = `${cellDate}-${h}`;
                      const isDropTarget = dropTargetHour === dropKey;

                      if (cell.kind === 'booked') {
                        return (
                          <td
                            key={cellDate}
                            className={`agenda-td agenda-td-booked ${isPast ? 'agenda-td-past' : 'agenda-td-draggable'}`}
                            draggable={!isPast}
                            onDragStart={() => setDragLesson(cell.lesson)}
                            onDragEnd={() => {
                              setDragLesson(null);
                              setDropTargetHour(null);
                            }}
                            onClick={() => openCellMenu(h, cellDate)}
                          >
                            <div className="agenda-td-content">
                              <span className="agenda-td-name">
                                {cell.lesson.studentName.split(' ')[0] || '—'}
                              </span>
                              <span className="agenda-td-status">
                                {cell.lesson.status === 'confirmed' ? '✓' : '⏳'}
                              </span>
                            </div>
                          </td>
                        );
                      }
                      if (cell.kind === 'available') {
                        return (
                          <td
                            key={cellDate}
                            className={`agenda-td agenda-td-free ${isPast ? 'agenda-td-past' : ''} ${isDropTarget ? 'agenda-td-drop-target' : ''}`}
                            onClick={() => !isPast && openCellMenu(h, cellDate)}
                            onDragOver={(e) => {
                              if (!isPast) {
                                e.preventDefault();
                                setDropTargetHour(dropKey);
                              }
                            }}
                            onDragLeave={() => setDropTargetHour(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (!isPast) {
                                if (cellDate !== date) setDate(cellDate);
                                void handleDrop(h);
                              }
                            }}
                          >
                            <span className="agenda-free-label">
                              {isPast ? '—' : isDropTarget ? '⬇' : 'Müsait'}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td
                          key={cellDate}
                          className={`agenda-td agenda-td-empty ${isPast ? 'agenda-td-past' : ''} ${isDropTarget ? 'agenda-td-drop-target' : ''}`}
                          onClick={() => !isPast && openCellMenu(h, cellDate)}
                          onDragOver={(e) => {
                            if (!isPast) {
                              e.preventDefault();
                              setDropTargetHour(dropKey);
                            }
                          }}
                          onDragLeave={() => setDropTargetHour(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (!isPast) {
                              if (cellDate !== date) setDate(cellDate);
                              void handleDrop(h);
                            }
                          }}
                        >
                          <span className="agenda-empty-plus">
                            {isPast ? '—' : isDropTarget ? '⬇' : '+'}
                          </span>
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

      {/* Modal */}
      {action && (
        <div className="agenda-modal-overlay" onClick={close}>
          <div className="agenda-modal" onClick={(e) => e.stopPropagation()}>
            {action.mode === 'menu' && action.cell.kind === 'empty' && (
              <>
                <div className="agenda-modal-header">
                  <h3>➕ Boş Slot</h3>
                  <button className="agenda-modal-close" onClick={close}>
                    ✕
                  </button>
                </div>
                <div className="agenda-modal-info">
                  <span>🕐 {action.hour}–{`${String(parseInt(action.hour) + 1).padStart(2, '0')}:00`}</span>
                </div>
                <div className="agenda-modal-actions">
                  <button
                    className="agenda-action-btn agenda-action-book"
                    onClick={() => void handleAddSlot()}
                    disabled={actionLoading}
                  >
                    ➕ Slot Ekle
                  </button>
                  <button
                    className="agenda-action-btn agenda-action-book"
                    onClick={() => setAction({ mode: 'book', cell: action.cell, hour: action.hour })}
                  >
                    📅 Direkt Ders Oluştur
                  </button>
                </div>
              </>
            )}

            {action.mode === 'menu' && action.cell.kind === 'available' && (
              <>
                <div className="agenda-modal-header">
                  <h3>🟢 Müsait</h3>
                  <button className="agenda-modal-close" onClick={close}>
                    ✕
                  </button>
                </div>
                <div className="agenda-modal-info">
                  <span>
                    🕐 {action.cell.slot.startTime.slice(0, 5)}–{action.cell.slot.endTime.slice(0, 5)}
                  </span>
                </div>
                <div className="agenda-modal-actions">
                  <button
                    className="agenda-action-btn agenda-action-book"
                    onClick={() => setAction({ mode: 'book', cell: action.cell, hour: action.hour })}
                  >
                    📅 Ders Oluştur
                  </button>
                  <button
                    className="agenda-action-btn agenda-action-cancel"
                    onClick={() => void handleDeleteSlot()}
                    disabled={actionLoading}
                  >
                    🚫 Slotu Sil
                  </button>
                </div>
              </>
            )}

            {action.mode === 'menu' && action.cell.kind === 'booked' && (
              <>
                <div className="agenda-modal-header">
                  <h3>📌 Ders</h3>
                  <button className="agenda-modal-close" onClick={close}>
                    ✕
                  </button>
                </div>
                <div className="agenda-modal-info">
                  <span>👤 {action.cell.lesson.studentName}</span>
                  <span>
                    🕐 {new Date(action.cell.lesson.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(action.cell.lesson.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="agenda-modal-actions">
                  <button
                    className="agenda-action-btn agenda-action-complete"
                    onClick={() => void handleCompleteLesson()}
                    disabled={actionLoading}
                  >
                    ✅ Tamamlandı
                  </button>
                  <button
                    className="agenda-action-btn agenda-action-cancel"
                    onClick={() => void handleCancelLesson()}
                    disabled={actionLoading}
                  >
                    ❌ İptal
                  </button>
                  <button
                    className="agenda-action-btn agenda-action-book"
                    onClick={() => {
                      const lesson = action.cell.kind === 'booked' ? action.cell.lesson : null;
                      if (!lesson) return;
                      setRescheduleDate(date);
                      setRescheduleHour(
                        new Date(lesson.startTime).toISOString().slice(11, 13),
                      );
                      setAction({ mode: 'reschedule', lesson });
                    }}
                  >
                    📅 İleri Tarihe Al
                  </button>
                  <button
                    className="agenda-action-btn agenda-action-book"
                    onClick={() => void handleRemindLesson()}
                    disabled={actionLoading}
                  >
                    📱 Hatırlatma
                  </button>
                </div>
              </>
            )}

            {action.mode === 'book' && (
              <>
                <div className="agenda-modal-header">
                  <h3>📅 Ders Oluştur</h3>
                  <button className="agenda-modal-close" onClick={close}>
                    ✕
                  </button>
                </div>
                <div className="agenda-modal-info">
                  <span>🕐 {action.hour}–{`${String(parseInt(action.hour) + 1).padStart(2, '0')}:00`}</span>
                </div>
                <div className="agenda-modal-form">
                  <label className="form-label">Öğrenci Seç</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="İsim ile ara..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  {selectedStudent ? (
                    <div className="agenda-selected-member">
                      ✅ {selectedStudent.firstName} {selectedStudent.lastName}
                      <button
                        className="btn-sm btn-outline"
                        style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.7rem' }}
                        onClick={() => setSelectedStudent(null)}
                      >
                        Değiştir
                      </button>
                    </div>
                  ) : (
                    <div className="agenda-member-list">
                      {filteredStudents.length === 0 && (
                        <p className="muted" style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                          Öğrenci bulunamadı.
                        </p>
                      )}
                      {filteredStudents.map((s) => (
                        <div
                          key={s.userId}
                          className="agenda-member-item"
                          onClick={() => setSelectedStudent(s)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <div>
                              <strong>
                                {s.firstName} {s.lastName}
                              </strong>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: 'var(--muted)',
                                  display: 'block',
                                }}
                              >
                                {s.email}
                              </span>
                            </div>
                            {s.linked ? (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: '#dcfce7',
                                  color: '#166534',
                                }}
                              >
                                ✓ Bağlı
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: '#f1f5f9',
                                  color: '#64748b',
                                }}
                              >
                                Üye
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn-sm btn-primary"
                      disabled={!selectedStudent || actionLoading}
                      onClick={() => void handleBookSlot()}
                    >
                      {actionLoading ? '⏳...' : '✓ Oluştur'}
                    </button>
                    <button
                      className="btn-sm btn-outline"
                      onClick={() =>
                        setAction({ mode: 'menu', cell: action.cell, hour: action.hour })
                      }
                    >
                      Geri
                    </button>
                  </div>
                </div>
              </>
            )}

            {action.mode === 'reschedule' && (
              <>
                <div className="agenda-modal-header">
                  <h3>📅 Dersi Taşı</h3>
                  <button className="agenda-modal-close" onClick={close}>
                    ✕
                  </button>
                </div>
                <div className="agenda-modal-info">
                  <span>👤 {action.lesson.studentName}</span>
                </div>
                <div className="agenda-modal-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Yeni Tarih</span>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="form-input"
                        min={todayISO()}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Yeni Saat</span>
                      <select
                        value={rescheduleHour}
                        onChange={(e) => setRescheduleHour(e.target.value)}
                        className="form-input"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
                          <option key={h} value={String(h).padStart(2, '0')}>
                            {String(h).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn-sm btn-primary"
                      disabled={actionLoading || !rescheduleDate}
                      onClick={() => void handleRescheduleSubmit()}
                    >
                      {actionLoading ? '⏳...' : '✓ Taşı'}
                    </button>
                    <button className="btn-sm btn-outline" onClick={close}>
                      İptal
                    </button>
                  </div>
                </div>
              </>
            )}

            {action.mode === 'bulkSlot' && (
              <>
                <div className="agenda-modal-header">
                  <h3>🕐 Çalışma Saatleri</h3>
                  <button className="agenda-modal-close" onClick={close}>
                    ✕
                  </button>
                </div>
                <div className="agenda-modal-info">
                  <span>
                    📅{' '}
                    {new Date(date).toLocaleDateString('tr-TR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
                <div className="agenda-modal-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Başlangıç</span>
                      <select
                        value={bulkStartHour}
                        onChange={(e) => setBulkStartHour(Number(e.target.value))}
                        className="form-input"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span className="form-label">Bitiş</span>
                      <select
                        value={bulkEndHour}
                        onChange={(e) => setBulkEndHour(Number(e.target.value))}
                        className="form-input"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, '0')}:00
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: '0.5rem 0 0' }}>
                    {bulkEndHour - bulkStartHour} slot oluşturulacak
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="btn-sm btn-primary"
                      disabled={actionLoading || bulkEndHour <= bulkStartHour}
                      onClick={() => void handleBulkAddSlots()}
                    >
                      {actionLoading
                        ? '⏳...'
                        : `✓ ${bulkEndHour - bulkStartHour} Slot Ekle`}
                    </button>
                    <button className="btn-sm btn-outline" onClick={close}>
                      İptal
                    </button>
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
