import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiJson, ApiError } from '../lib/api';

type TrainerEvent = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  category: string;
  price: string;
  requirements: string | null;
  status: string;
  published: boolean;
  registrationCount?: number;
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Taslak', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  pending_approval: { label: 'Onay Bekliyor', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  approved: { label: 'Onaylandı', color: '#166534', bg: '#dcfce7', border: '#86efac' },
  rejected: { label: 'Reddedildi', color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
  cancelled: { label: 'İptal', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
};

const CATEGORIES = [
  { value: 'general', label: 'Genel', icon: '🎯' },
  { value: 'yoga', label: 'Yoga', icon: '🧘' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'outdoor', label: 'Outdoor', icon: '🏞️' },
  { value: 'social', label: 'Sosyal', icon: '🤝' },
  { value: 'wellness', label: 'Wellness', icon: '🌿' },
  { value: 'workshop', label: 'Workshop', icon: '🛠️' },
  { value: 'seminar', label: 'Seminer', icon: '🎓' },
];

type FilterTab = 'all' | 'upcoming' | 'pending' | 'approved' | 'past';

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'Tümü' },
  { id: 'upcoming', label: 'Yaklaşan' },
  { id: 'pending', label: 'Onay Bekleyen' },
  { id: 'approved', label: 'Onaylanmış' },
  { id: 'past', label: 'Geçmiş' },
];

type FormState = {
  id: string | null;
  title: string;
  description: string;
  location: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  capacity: string;
  price: string;
  requirements: string;
  imageUrl: string;
  recurring: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  recurringEndDate: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  description: '',
  location: '',
  category: 'general',
  eventDate: '',
  startTime: '',
  endTime: '',
  capacity: '20',
  price: '0',
  requirements: '',
  imageUrl: '',
  recurring: false,
  frequency: 'weekly',
  recurringEndDate: '',
};

export function TrainerEventsPage() {
  const [events, setEvents] = useState<TrainerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Katılımcı modal
  const [participants, setParticipants] = useState<Array<{
    id: string; userId: string; firstName: string; lastName: string;
    email: string; phone: string | null; photoUrl: string | null;
    registeredAt: string; checkedIn: boolean;
  }> | null>(null);
  const [participantsTitle, setParticipantsTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TrainerEvent[]>('/trainer-panel/events');
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Etkinlikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(msg: string) {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 3500);
  }
  function flashErr(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 4500);
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/events/${id}`, { method: 'DELETE' });
      await load();
      flash('✅ Etkinlik silindi');
    } catch (err) {
      flashErr(err instanceof ApiError ? err.message : 'Silinemedi');
    }
  }

  async function loadParticipants(eventId: string) {
    try {
      const data = await apiJson<{
        eventTitle: string;
        participants: typeof participants;
      }>(`/trainer-panel/events/${eventId}/participants`);
      setParticipantsTitle(data.eventTitle);
      setParticipants(data.participants);
    } catch (err) {
      flashErr(err instanceof ApiError ? err.message : 'Katılımcılar yüklenemedi');
    }
  }

  function startEdit(ev: TrainerEvent) {
    const start = new Date(ev.startsAt);
    const end = ev.endsAt ? new Date(ev.endsAt) : null;
    setForm({
      id: ev.id,
      title: ev.title,
      description: ev.description ?? '',
      location: ev.location ?? '',
      category: ev.category || 'general',
      eventDate: start.toISOString().slice(0, 10),
      startTime: start.toTimeString().slice(0, 5),
      endTime: end ? end.toTimeString().slice(0, 5) : '',
      capacity: String(ev.capacity || 20),
      price: ev.price || '0',
      requirements: ev.requirements ?? '',
      imageUrl: ev.imageUrl ?? '',
      recurring: false,
      frequency: 'weekly',
      recurringEndDate: '',
    });
    setShowForm(true);
    setError(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleUploadImage(file: File) {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiJson<{ url: string }>('/auth/upload-avatar', {
        method: 'POST',
        body: fd,
        headers: undefined,
      });
      setForm((prev) => ({ ...prev, imageUrl: res.url }));
      flash('✅ Görsel yüklendi');
    } catch (err) {
      flashErr(err instanceof ApiError ? err.message : 'Görsel yüklenemedi');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return flashErr('Başlık zorunlu');
    if (!form.eventDate || !form.startTime) return flashErr('Tarih ve başlangıç saati zorunlu');
    if (!form.location.trim()) return flashErr('Konum zorunlu');

    setSaving(true);
    setError(null);
    try {
      const startsAt = new Date(`${form.eventDate}T${form.startTime}:00`).toISOString();
      const endsAt = form.endTime
        ? new Date(`${form.eventDate}T${form.endTime}:00`).toISOString()
        : null;

      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim(),
        startsAt,
        endsAt,
        capacity: Number(form.capacity) || 20,
        category: form.category,
        price: parseFloat(form.price) || 0,
        requirements: form.requirements.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
      };

      if (form.id) {
        // Güncelleme
        await apiJson(`/trainer-panel/events/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        flash('✅ Etkinlik güncellendi (yeniden onay sürecine alındı)');
      } else {
        // Oluşturma
        if (form.recurring) {
          payload.recurringRule = {
            frequency: form.frequency,
            endDate: form.recurringEndDate || undefined,
          };
        }
        await apiJson('/trainer-panel/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        flash('✅ Etkinlik oluşturuldu! Süper admin onayından sonra yayınlanacak.');
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      flashErr(err instanceof ApiError ? err.message : 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  const now = useMemo(() => new Date(), []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const start = new Date(ev.startsAt);
      const isPast = start < now;
      switch (filter) {
        case 'upcoming':
          return !isPast && ev.status !== 'rejected' && ev.status !== 'cancelled';
        case 'pending':
          return ev.status === 'pending_approval';
        case 'approved':
          return ev.status === 'approved';
        case 'past':
          return isPast;
        default:
          return true;
      }
    });
  }, [events, filter, now]);

  const stats = useMemo(() => {
    const total = events.length;
    const pending = events.filter((e) => e.status === 'pending_approval').length;
    const approved = events.filter((e) => e.status === 'approved').length;
    const upcoming = events.filter(
      (e) =>
        new Date(e.startsAt) >= now && e.status !== 'rejected' && e.status !== 'cancelled',
    ).length;
    const totalRegistrations = events.reduce(
      (sum, e) => sum + (e.registrationCount ?? 0),
      0,
    );
    return { total, pending, approved, upcoming, totalRegistrations };
  }, [events, now]);

  return (
    <div className="trainer-events-page">
      <div className="trainer-events-header">
        <div>
          <h1 className="dashboard-title">Etkinliklerim</h1>
          <p className="dashboard-subtitle">
            Etkinlik oluştur, takip et ve katılımcılarını yönet (yeni etkinlikler süper admin onayı gerektirir)
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={startCreate}>
          + Etkinlik Oluştur
        </button>
      </div>

      {error && <div className="profile-banner profile-banner-error">{error}</div>}
      {success && <div className="profile-banner profile-banner-success">{success}</div>}

      {/* İstatistikler */}
      {!loading && events.length > 0 && (
        <div className="trainer-events-stats">
          <div className="trainer-events-stat">
            <span className="trainer-events-stat-icon">📊</span>
            <div>
              <strong>{stats.total}</strong>
              <span>Toplam</span>
            </div>
          </div>
          <div className="trainer-events-stat">
            <span className="trainer-events-stat-icon">📅</span>
            <div>
              <strong>{stats.upcoming}</strong>
              <span>Yaklaşan</span>
            </div>
          </div>
          <div className="trainer-events-stat">
            <span className="trainer-events-stat-icon">✅</span>
            <div>
              <strong>{stats.approved}</strong>
              <span>Onaylanmış</span>
            </div>
          </div>
          <div className="trainer-events-stat">
            <span className="trainer-events-stat-icon">⏳</span>
            <div>
              <strong>{stats.pending}</strong>
              <span>Bekleyen</span>
            </div>
          </div>
          <div className="trainer-events-stat">
            <span className="trainer-events-stat-icon">👥</span>
            <div>
              <strong>{stats.totalRegistrations}</strong>
              <span>Katılımcı</span>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <section className="services-card services-form-card">
          <div className="services-form-head">
            <h3 className="services-form-title">
              {form.id ? '✏️ Etkinliği Düzenle' : '➕ Yeni Etkinlik'}
            </h3>
            <p className="services-form-hint">
              ⚠️ Etkinlik {form.id ? 'düzenlendiğinde tekrar' : ''} süper admin onayından sonra
              yayınlanacaktır.
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="services-form-grid">
            <label className="profile-field" style={{ gridColumn: '1 / -1' }}>
              <span>Başlık *</span>
              <input
                className="profile-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
                placeholder="Grup Yoga Dersi"
              />
            </label>

            <label className="profile-field">
              <span>Kategori</span>
              <select
                className="profile-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="profile-field">
              <span>Konum *</span>
              <input
                className="profile-input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                required
                placeholder="Park / Stüdyo / Online"
              />
            </label>

            <label className="profile-field">
              <span>Tarih *</span>
              <input
                type="date"
                className="profile-input"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </label>

            <label className="profile-field">
              <span>Başlangıç *</span>
              <input
                type="time"
                className="profile-input"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
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

            <label className="profile-field">
              <span>Kapasite</span>
              <input
                type="number"
                min={1}
                max={1000}
                className="profile-input"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </label>

            <label className="profile-field">
              <span>Ücret (₺)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="profile-input"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0 = Ücretsiz"
              />
            </label>

            <label className="profile-field" style={{ gridColumn: '1 / -1' }}>
              <span>Gereksinimler</span>
              <input
                className="profile-input"
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="Mat, havlu, su..."
              />
            </label>

            <label className="profile-field" style={{ gridColumn: '1 / -1' }}>
              <span>Açıklama</span>
              <textarea
                className="profile-input profile-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                maxLength={2000}
                placeholder="Etkinlik detayları, akış, hedef kitle..."
              />
            </label>

            {/* Görsel yükleme */}
            <div className="profile-field" style={{ gridColumn: '1 / -1' }}>
              <span>Etkinlik Görseli</span>
              <div className="event-image-upload">
                {form.imageUrl ? (
                  <div className="event-image-preview">
                    <img src={form.imageUrl} alt="Etkinlik" />
                    <button
                      type="button"
                      className="event-image-remove"
                      onClick={() => setForm({ ...form, imageUrl: '' })}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="event-image-dropzone">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadImage(f);
                      }}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                    <span className="event-image-dropzone-icon">📷</span>
                    <span>
                      {uploadingImage ? 'Yükleniyor...' : 'Görsel ekle (önerilen 1200×630)'}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Tekrarlayan etkinlik (sadece oluştururken) */}
            {!form.id && (
              <div
                className="event-recurring-box"
                style={{ gridColumn: '1 / -1' }}
              >
                <label className="event-recurring-toggle">
                  <input
                    type="checkbox"
                    checked={form.recurring}
                    onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                  />
                  <span>🔁 Tekrarlayan Etkinlik</span>
                </label>
                {form.recurring && (
                  <div className="event-recurring-grid">
                    <label className="profile-field">
                      <span>Sıklık</span>
                      <select
                        className="profile-input"
                        value={form.frequency}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                          })
                        }
                      >
                        <option value="daily">Her Gün</option>
                        <option value="weekly">Her Hafta</option>
                        <option value="monthly">Her Ay</option>
                      </select>
                    </label>
                    <label className="profile-field">
                      <span>Bitiş Tarihi</span>
                      <input
                        type="date"
                        className="profile-input"
                        value={form.recurringEndDate}
                        onChange={(e) =>
                          setForm({ ...form, recurringEndDate: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="services-form-actions" style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="btn-outline" onClick={cancelForm}>
                İptal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving
                  ? '⏳ Gönderiliyor...'
                  : form.id
                    ? '✓ Değişiklikleri Kaydet'
                    : '✓ Onaya Gönder'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Filter Tabs */}
      {!loading && events.length > 0 && (
        <div className="services-tabs trainer-events-tabs">
          {FILTER_TABS.map((t) => {
            const count = (() => {
              switch (t.id) {
                case 'upcoming':
                  return stats.upcoming;
                case 'pending':
                  return stats.pending;
                case 'approved':
                  return stats.approved;
                case 'past':
                  return events.filter((e) => new Date(e.startsAt) < now).length;
                default:
                  return events.length;
              }
            })();
            return (
              <button
                key={t.id}
                type="button"
                className={`services-tab ${filter === t.id ? 'active' : ''}`}
                onClick={() => setFilter(t.id)}
              >
                {t.label}{' '}
                <span className="services-tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Etkinlik Listesi */}
      {loading ? (
        <p className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
          Yükleniyor...
        </p>
      ) : events.length === 0 ? (
        <div className="services-empty">
          <span className="services-empty-icon">📅</span>
          <p>Henüz etkinlik oluşturmadınız</p>
          <button type="button" className="btn-primary" onClick={startCreate}>
            + İlk Etkinliğini Oluştur
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="services-empty">
          <p>Bu filtrede etkinlik yok</p>
        </div>
      ) : (
        <div className="trainer-events-grid">
          {filteredEvents.map((ev) => {
            const st = STATUS_LABELS[ev.status] || STATUS_LABELS.draft;
            const cat = CATEGORIES.find((c) => c.value === ev.category) || CATEGORIES[0];
            const start = new Date(ev.startsAt);
            const isPast = start < now;
            const fillRate = ev.capacity > 0
              ? Math.round(((ev.registrationCount ?? 0) / ev.capacity) * 100)
              : 0;
            return (
              <article key={ev.id} className={`trainer-event-card ${isPast ? 'is-past' : ''}`}>
                {ev.imageUrl && (
                  <div className="trainer-event-image">
                    <img src={ev.imageUrl} alt={ev.title} />
                  </div>
                )}
                <div className="trainer-event-body">
                  <div className="trainer-event-top">
                    <span
                      className="trainer-event-status"
                      style={{ background: st.bg, color: st.color, borderColor: st.border }}
                    >
                      {st.label}
                    </span>
                    <span className="trainer-event-cat">
                      {cat.icon} {cat.label}
                    </span>
                  </div>
                  <h3 className="trainer-event-title">{ev.title}</h3>
                  <div className="trainer-event-meta">
                    <span>
                      📅{' '}
                      {start.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span>
                      🕐{' '}
                      {start.toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {ev.endsAt &&
                        ` - ${new Date(ev.endsAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                    </span>
                    {ev.location && <span>📍 {ev.location}</span>}
                  </div>

                  {/* Katılımcı barı */}
                  <div className="trainer-event-attendance">
                    <div className="trainer-event-attendance-label">
                      <span>
                        👥 {ev.registrationCount ?? 0} / {ev.capacity} katılımcı
                      </span>
                      <strong>{fillRate}%</strong>
                    </div>
                    <div className="trainer-event-attendance-bar">
                      <div
                        className="trainer-event-attendance-fill"
                        style={{
                          width: `${Math.min(fillRate, 100)}%`,
                          background:
                            fillRate >= 100
                              ? '#dc2626'
                              : fillRate >= 75
                                ? '#d97706'
                                : '#2563eb',
                        }}
                      />
                    </div>
                  </div>

                  <div className="trainer-event-bottom">
                    <span className="trainer-event-price">
                      {parseFloat(ev.price) > 0
                        ? `₺${parseFloat(ev.price).toLocaleString('tr-TR')}`
                        : 'Ücretsiz'}
                    </span>
                    <div className="trainer-event-actions">
                      {(ev.registrationCount ?? 0) > 0 && (
                        <button
                          type="button"
                          className="btn-sm btn-outline"
                          onClick={() => void loadParticipants(ev.id)}
                        >
                          👥 Katılımcılar
                        </button>
                      )}
                      {!isPast && (
                        <button
                          type="button"
                          className="btn-sm btn-outline"
                          onClick={() => startEdit(ev)}
                        >
                          ✏️ Düzenle
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        onClick={() => void handleDelete(ev.id)}
                      >
                        🗑 Sil
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Katılımcılar Modal */}
      {participants && (
        <div className="modal-overlay" onClick={() => setParticipants(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>👥 {participantsTitle} — Katılımcılar</h3>
              <button className="modal-close" onClick={() => setParticipants(null)}>✕</button>
            </div>
            {participants.length === 0 ? (
              <p className="muted" style={{ padding: '1rem 0' }}>Henüz katılımcı yok.</p>
            ) : (
              <div className="add-student-list" style={{ marginTop: '0.75rem' }}>
                {participants.map((p) => (
                  <div key={p.id} className="add-student-row">
                    <div className="add-student-avatar">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt="" />
                      ) : (
                        <span>{p.firstName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="add-student-info">
                      <strong>{p.firstName} {p.lastName}</strong>
                      <span className="muted">{p.email}{p.phone ? ` · ${p.phone}` : ''}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(p.registeredAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
