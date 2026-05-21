import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

type CalendarItem = {
  id: string;
  type: 'personal' | 'lesson' | 'event';
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  category: string;
  color: string;
  completed: boolean;
  meta?: Record<string, unknown>;
};

type ViewMode = 'week' | 'day';

const CATEGORIES = [
  { value: 'workout', label: '🏋️ Antrenman', color: '#2563eb' },
  { value: 'nutrition', label: '🥗 Beslenme', color: '#059669' },
  { value: 'sleep', label: '😴 Uyku', color: '#7c3aed' },
  { value: 'hydration', label: '💧 Su', color: '#0891b2' },
  { value: 'meditation', label: '🧘 Meditasyon', color: '#d946ef' },
  { value: 'personal', label: '📋 Kişisel', color: '#f59e0b' },
  { value: 'other', label: '📌 Diğer', color: '#64748b' },
];

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 - 22:00

function getWeekDates(offset: number): string[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${d.toLocaleDateString('tr-TR', { month: 'short' })}`;
}

function parseHour(time: string | null): number {
  if (!time) return -1;
  const [h] = time.split(':');
  return parseInt(h, 10);
}

export function MemberCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('day');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '',
    endTime: '',
    category: 'personal',
    color: '#f59e0b',
  });
  const [saving, setSaving] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const from = view === 'week' ? weekDates[0] : selectedDate;
  const to = view === 'week' ? weekDates[6] : selectedDate;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<CalendarItem[]>(`/member/calendar?from=${from}&to=${to}`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  function openCreate(date?: string, time?: string) {
    setEditId(null);
    setForm({
      title: '',
      description: '',
      date: date || selectedDate,
      startTime: time || '',
      endTime: time ? `${String(parseInt(time.split(':')[0], 10) + 1).padStart(2, '0')}:00` : '',
      category: 'personal',
      color: '#f59e0b',
    });
    setShowForm(true);
  }

  function openEdit(item: CalendarItem) {
    if (item.type !== 'personal') return;
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      date: item.date,
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      category: item.category,
      color: item.color,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        category: form.category,
        color: form.color,
      };
      if (editId) {
        await apiJson(`/member/calendar/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiJson('/member/calendar', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/member/calendar/${id}`, { method: 'DELETE' });
      await load();
    } catch { alert('Silinemedi'); }
  }

  async function handleToggle(id: string) {
    try {
      await apiJson(`/member/calendar/${id}/toggle`, { method: 'PATCH' });
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)));
    } catch { /* */ }
  }

  const today = new Date().toISOString().slice(0, 10);

  // Günlük: o günün verileri
  const dayItems = useMemo(() => items.filter((i) => i.date === selectedDate), [items, selectedDate]);

  // Tüm gün verileri (saat belirtilmemiş)
  const allDayItems = useMemo(() => dayItems.filter((i) => !i.startTime), [dayItems]);
  // Saatli veriler
  const timedItems = useMemo(() => dayItems.filter((i) => i.startTime), [dayItems]);

  // Haftalık: gün bazlı gruplama
  const weekGroups = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const d of weekDates) map.set(d, []);
    for (const item of items) {
      const arr = map.get(item.date);
      if (arr) arr.push(item);
    }
    return map;
  }, [items, weekDates]);

  return (
    <div className="member-calendar-page">
      {/* Header */}
      <div className="mcal-header">
        <div>
          <Link to="/dashboard" className="mcal-back-btn">← Panele Dön</Link>
          <h1 className="mcal-title">📅 Ajandam</h1>
          <p className="mcal-subtitle">Dersleriniz, etkinlikleriniz ve kişisel planlarınız</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => openCreate()}>
          + Plan Ekle
        </button>
      </div>

      {/* Controls */}
      <div className="mcal-controls">
        <div className="mcal-view-toggle">
          <button type="button" className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>
            Gün
          </button>
          <button type="button" className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>
            Hafta
          </button>
        </div>

        {view === 'day' && (
          <div className="mcal-day-nav">
            <button type="button" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().slice(0, 10)); }}>←</button>
            <span className="mcal-day-label">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {selectedDate === today && ' (Bugün)'}
            </span>
            <button type="button" onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().slice(0, 10)); }}>→</button>
            {selectedDate !== today && (
              <button type="button" className="mcal-today-btn" onClick={() => setSelectedDate(today)}>Bugün</button>
            )}
          </div>
        )}

        {view === 'week' && (
          <div className="mcal-week-nav">
            <button type="button" onClick={() => setWeekOffset((v) => v - 1)}>← Önceki</button>
            <span className="mcal-week-label">
              {formatDateLabel(weekDates[0])} — {formatDateLabel(weekDates[6])}
              {weekOffset === 0 && ' (Bu Hafta)'}
            </span>
            <button type="button" onClick={() => setWeekOffset((v) => v + 1)}>Sonraki →</button>
            {weekOffset !== 0 && (
              <button type="button" className="mcal-today-btn" onClick={() => setWeekOffset(0)}>Bu Hafta</button>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mcal-legend">
        <span className="mcal-legend-item"><span className="mcal-legend-dot" style={{ background: '#2563eb' }} /> PT Ders</span>
        <span className="mcal-legend-item"><span className="mcal-legend-dot" style={{ background: '#059669' }} /> Etkinlik</span>
        <span className="mcal-legend-item"><span className="mcal-legend-dot" style={{ background: '#f59e0b' }} /> Kişisel Plan</span>
      </div>

      {loading && <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Yükleniyor...</p>}

      {/* ═══ GÜNLÜK TIMELINE GÖRÜNÜM ═══ */}
      {!loading && view === 'day' && (
        <div className="mcal-timeline">
          {/* Tüm gün etkinlikleri */}
          {allDayItems.length > 0 && (
            <div className="mcal-allday">
              <span className="mcal-allday-label">Tüm Gün</span>
              <div className="mcal-allday-items">
                {allDayItems.map((item) => (
                  <div
                    key={item.id}
                    className={`mcal-allday-chip ${item.completed ? 'done' : ''}`}
                    style={{ background: item.color + '18', borderColor: item.color, color: item.color }}
                    onClick={() => openEdit(item)}
                  >
                    {item.type === 'personal' && (
                      <input type="checkbox" checked={item.completed} onChange={() => void handleToggle(item.id)} onClick={(e) => e.stopPropagation()} className="mcal-check" />
                    )}
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saat dilimleri */}
          <div className="mcal-hours">
            {HOURS.map((hour) => {
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              const hourItems = timedItems.filter((i) => parseHour(i.startTime) === hour);
              return (
                <div key={hour} className="mcal-hour-row">
                  <div className="mcal-hour-label">{hourStr}</div>
                  <div
                    className="mcal-hour-content"
                    onClick={() => openCreate(selectedDate, hourStr)}
                  >
                    {hourItems.length > 0 ? (
                      hourItems.map((item) => (
                        <div
                          key={item.id}
                          className={`mcal-hour-item ${item.completed ? 'done' : ''}`}
                          style={{ borderLeftColor: item.color, background: item.color + '0a' }}
                          onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                        >
                          {item.type === 'personal' && (
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => void handleToggle(item.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="mcal-check"
                            />
                          )}
                          <div className="mcal-hour-item-body">
                            <strong>{item.title}</strong>
                            <span className="mcal-hour-item-time">
                              {item.startTime}{item.endTime ? ` — ${item.endTime}` : ''}
                            </span>
                            {item.description && <p className="mcal-hour-item-desc">{item.description}</p>}
                          </div>
                          {item.type === 'personal' && (
                            <button className="mcal-hour-item-del" onClick={(e) => { e.stopPropagation(); void handleDelete(item.id); }}>🗑</button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="mcal-hour-empty" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ HAFTALIK GRID GÖRÜNÜM ═══ */}
      {!loading && view === 'week' && (
        <div className="mcal-week-grid">
          {weekDates.map((dateStr) => {
            const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
            const isToday = dateStr === today;
            const dayItemsList = weekGroups.get(dateStr) || [];
            return (
              <div key={dateStr} className={`mcal-day-col ${isToday ? 'mcal-today' : ''}`}>
                <div className="mcal-day-header" onClick={() => { setSelectedDate(dateStr); setView('day'); }}>
                  <span className="mcal-day-name">{DAY_NAMES[dayOfWeek]}</span>
                  <span className="mcal-day-num">{new Date(dateStr + 'T12:00:00').getDate()}</span>
                </div>
                <div className="mcal-day-items">
                  {dayItemsList.map((item) => (
                    <div
                      key={item.id}
                      className={`mcal-item ${item.completed ? 'mcal-item-done' : ''}`}
                      style={{ borderLeftColor: item.color }}
                      onClick={() => { if (item.type === 'personal') openEdit(item); }}
                    >
                      <div className="mcal-item-body">
                        <span className="mcal-item-title">{item.title}</span>
                        {item.startTime && <span className="mcal-item-time">{item.startTime}</span>}
                      </div>
                    </div>
                  ))}
                  <button type="button" className="mcal-add-mini" onClick={() => openCreate(dateStr)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editId ? '✏️ Plan Düzenle' : '+ Yeni Plan'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <label className="profile-field">
                <span>Başlık *</span>
                <input type="text" className="profile-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sabah koşusu, protein shake, yoga..." maxLength={200} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <label className="profile-field">
                  <span>Tarih *</span>
                  <input type="date" className="profile-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <label className="profile-field">
                  <span>Başlangıç</span>
                  <input type="time" className="profile-input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </label>
                <label className="profile-field">
                  <span>Bitiş</span>
                  <input type="time" className="profile-input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </label>
              </div>
              <label className="profile-field">
                <span>Kategori</span>
                <div className="mcal-category-chips">
                  {CATEGORIES.map((c) => (
                    <button key={c.value} type="button" className={`mcal-cat-chip ${form.category === c.value ? 'active' : ''}`} style={form.category === c.value ? { background: c.color + '18', borderColor: c.color, color: c.color } : {}} onClick={() => setForm({ ...form, category: c.value, color: c.color })}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </label>
              <label className="profile-field">
                <span>Not</span>
                <textarea className="profile-input profile-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detay, hedef, hatırlatma..." maxLength={500} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                {editId && (
                  <button type="button" className="btn-danger btn-sm" style={{ marginRight: 'auto' }} onClick={() => { void handleDelete(editId); setShowForm(false); }}>🗑 Sil</button>
                )}
                <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>İptal</button>
                <button type="button" className="btn-primary" onClick={() => void handleSave()} disabled={saving || !form.title.trim()}>{saving ? '⏳' : editId ? '✓ Kaydet' : '✓ Ekle'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
