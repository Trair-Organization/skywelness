import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function MemberCalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('week');
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
      const data = await apiJson<CalendarItem[]>(
        `/member/calendar?from=${from}&to=${to}`,
      );
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate(date?: string) {
    setEditId(null);
    setForm({
      title: '',
      description: '',
      date: date || selectedDate,
      startTime: '',
      endTime: '',
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
        await apiJson(`/member/calendar/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson('/member/calendar', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
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
    } catch {
      alert('Silinemedi');
    }
  }

  async function handleToggle(id: string) {
    try {
      await apiJson(`/member/calendar/${id}/toggle`, { method: 'PATCH' });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)),
      );
    } catch { /* */ }
  }

  const today = new Date().toISOString().slice(0, 10);

  // Günlük görünümde o günün verileri
  const dayItems = useMemo(
    () => items.filter((i) => i.date === selectedDate),
    [items, selectedDate],
  );

  // Haftalık görünümde gün bazlı gruplama
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
          <h1 className="mcal-title">📅 Ajandam</h1>
          <p className="mcal-subtitle">
            Dersleriniz, etkinlikleriniz ve kişisel planlarınız tek yerde
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={() => openCreate()}>
          + Plan Ekle
        </button>
      </div>

      {/* View toggle + navigation */}
      <div className="mcal-controls">
        <div className="mcal-view-toggle">
          <button
            type="button"
            className={view === 'week' ? 'active' : ''}
            onClick={() => setView('week')}
          >
            Hafta
          </button>
          <button
            type="button"
            className={view === 'day' ? 'active' : ''}
            onClick={() => setView('day')}
          >
            Gün
          </button>
        </div>

        {view === 'week' && (
          <div className="mcal-week-nav">
            <button type="button" onClick={() => setWeekOffset((v) => v - 1)}>
              ← Önceki
            </button>
            <span className="mcal-week-label">
              {formatDateLabel(weekDates[0])} — {formatDateLabel(weekDates[6])}
              {weekOffset === 0 && ' (Bu Hafta)'}
            </span>
            <button type="button" onClick={() => setWeekOffset((v) => v + 1)}>
              Sonraki →
            </button>
          </div>
        )}

        {view === 'day' && (
          <div className="mcal-day-nav">
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
            >
              ←
            </button>
            <span className="mcal-day-label">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {selectedDate === today && ' (Bugün)'}
            </span>
            <button
              type="button"
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().slice(0, 10));
              }}
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Renk açıklaması */}
      <div className="mcal-legend">
        <span className="mcal-legend-item">
          <span className="mcal-legend-dot" style={{ background: '#2563eb' }} /> Ders
        </span>
        <span className="mcal-legend-item">
          <span className="mcal-legend-dot" style={{ background: '#059669' }} /> Etkinlik
        </span>
        <span className="mcal-legend-item">
          <span className="mcal-legend-dot" style={{ background: '#f59e0b' }} /> Kişisel
        </span>
      </div>

      {loading && <p className="muted" style={{ textAlign: 'center' }}>Yükleniyor...</p>}

      {/* Haftalık Görünüm */}
      {!loading && view === 'week' && (
        <div className="mcal-week-grid">
          {weekDates.map((dateStr) => {
            const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
            const isToday = dateStr === today;
            const dayItems = weekGroups.get(dateStr) || [];
            return (
              <div
                key={dateStr}
                className={`mcal-day-col ${isToday ? 'mcal-today' : ''}`}
              >
                <div className="mcal-day-header">
                  <span className="mcal-day-name">{DAY_NAMES[dayOfWeek]}</span>
                  <span className="mcal-day-num">
                    {new Date(dateStr + 'T12:00:00').getDate()}
                  </span>
                </div>
                <div className="mcal-day-items">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={`mcal-item ${item.completed ? 'mcal-item-done' : ''}`}
                      style={{ borderLeftColor: item.color }}
                      onClick={() => {
                        if (item.type === 'personal') openEdit(item);
                      }}
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
                      <div className="mcal-item-body">
                        <span className="mcal-item-title">{item.title}</span>
                        {item.startTime && (
                          <span className="mcal-item-time">
                            {item.startTime}
                            {item.endTime ? `–${item.endTime}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mcal-add-mini"
                    onClick={() => openCreate(dateStr)}
                    title="Plan ekle"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Günlük Görünüm */}
      {!loading && view === 'day' && (
        <div className="mcal-day-view">
          {dayItems.length === 0 ? (
            <div className="mcal-empty">
              <span>📭</span>
              <p>Bu gün için plan yok</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => openCreate(selectedDate)}
              >
                + Plan Ekle
              </button>
            </div>
          ) : (
            <div className="mcal-day-list">
              {dayItems.map((item) => (
                <div
                  key={item.id}
                  className={`mcal-day-card ${item.completed ? 'mcal-day-card-done' : ''}`}
                  style={{ borderLeftColor: item.color }}
                >
                  <div className="mcal-day-card-left">
                    {item.type === 'personal' && (
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => void handleToggle(item.id)}
                        className="mcal-check"
                      />
                    )}
                    {item.type !== 'personal' && (
                      <span
                        className="mcal-type-badge"
                        style={{ background: item.color }}
                      >
                        {item.type === 'lesson' ? '🏋️' : '📅'}
                      </span>
                    )}
                  </div>
                  <div className="mcal-day-card-body">
                    <strong>{item.title}</strong>
                    {item.startTime && (
                      <span className="mcal-day-card-time">
                        🕐 {item.startTime}
                        {item.endTime ? ` — ${item.endTime}` : ''}
                      </span>
                    )}
                    {item.description && (
                      <p className="mcal-day-card-desc">{item.description}</p>
                    )}
                  </div>
                  {item.type === 'personal' && (
                    <div className="mcal-day-card-actions">
                      <button
                        type="button"
                        className="mcal-action-btn"
                        onClick={() => openEdit(item)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="mcal-action-btn mcal-action-delete"
                        onClick={() => void handleDelete(item.id)}
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>{editId ? '✏️ Plan Düzenle' : '+ Yeni Plan'}</h3>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <label className="profile-field">
                <span>Başlık *</span>
                <input
                  type="text"
                  className="profile-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Sabah koşusu, protein shake, yoga..."
                  maxLength={200}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <label className="profile-field">
                  <span>Tarih *</span>
                  <input
                    type="date"
                    className="profile-input"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label className="profile-field">
                  <span>Başlangıç</span>
                  <input
                    type="time"
                    className="profile-input"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </label>
                <label className="profile-field">
                  <span>Bitiş</span>
                  <input
                    type="time"
                    className="profile-input"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </label>
              </div>
              <label className="profile-field">
                <span>Kategori</span>
                <div className="mcal-category-chips">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`mcal-cat-chip ${form.category === c.value ? 'active' : ''}`}
                      style={
                        form.category === c.value
                          ? { background: c.color + '18', borderColor: c.color, color: c.color }
                          : {}
                      }
                      onClick={() => setForm({ ...form, category: c.value, color: c.color })}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </label>
              <label className="profile-field">
                <span>Not (opsiyonel)</span>
                <textarea
                  className="profile-input profile-textarea"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detay, hedef, hatırlatma..."
                  maxLength={500}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                  İptal
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void handleSave()}
                  disabled={saving || !form.title.trim()}
                >
                  {saving ? '⏳' : editId ? '✓ Kaydet' : '✓ Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
