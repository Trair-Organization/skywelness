import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { apiBaseUrl } from '../lib/config';

type ClubEventAdmin = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  published: boolean;
  category: string | null;
  createdAt: string;
};

type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  registeredAt: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export function EventsPage() {
  const [rows, setRows] = useState<ClubEventAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Katılımcı modal
  const [participants, setParticipants] = useState<{
    eventTitle: string;
    capacity: number;
    participantCount: number;
    participants: Participant[];
  } | null>(null);

  // Form
  const [form, setForm] = useState({
    title: '',
    description: '',
    coachName: '',
    location: '',
    imageUrl: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    capacity: '30',
    published: true,
    category: 'general',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<ClubEventAdmin[]>('/admin/events');
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Etkinlikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  function resetForm() {
    setForm({
      title: '',
      description: '',
      coachName: '',
      location: '',
      imageUrl: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      capacity: '30',
      published: true,
      category: 'general',
    });
    setEditId(null);
  }

  function openEdit(ev: ClubEventAdmin) {
    const startsAt = new Date(ev.startsAt);
    const endsAt = ev.endsAt ? new Date(ev.endsAt) : null;
    setForm({
      title: ev.title,
      description: ev.description || '',
      coachName: ev.coachName || '',
      location: ev.location || '',
      imageUrl: ev.imageUrl || '',
      eventDate: startsAt.toISOString().slice(0, 10),
      startTime: startsAt.toTimeString().slice(0, 5),
      endTime: endsAt ? endsAt.toTimeString().slice(0, 5) : '',
      capacity: ev.capacity.toString(),
      published: ev.published,
      category: ev.category || 'general',
    });
    setEditId(ev.id);
    setShowForm(true);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const base = apiBaseUrl();
      const res = await fetch(`${base}/auth/upload-image`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        const serverBase = base.replace('/api/v1', '');
        setForm((prev) => ({
          ...prev,
          imageUrl: body.url!.startsWith('http') ? body.url! : `${serverBase}${body.url}`,
        }));
      }
    } catch {
      setError('Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.eventDate || !form.startTime) {
      setError('Başlık, tarih ve saat zorunlu');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const startsAt = new Date(`${form.eventDate}T${form.startTime}:00`).toISOString();
      const endsAt = form.endTime
        ? new Date(`${form.eventDate}T${form.endTime}:00`).toISOString()
        : undefined;
      const payload = {
        title: form.title,
        description: form.description || undefined,
        coachName: form.coachName || undefined,
        location: form.location || undefined,
        imageUrl: form.imageUrl || undefined,
        startsAt,
        endsAt,
        capacity: Number(form.capacity) || 30,
        published: form.published,
        category: form.category,
      };
      if (editId) {
        await apiJson(`/admin/events/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccess('✅ Etkinlik güncellendi');
      } else {
        await apiJson('/admin/events', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('✅ Etkinlik oluşturuldu');
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

  async function remove(id: string) {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/admin/events/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Silinemedi');
    }
  }

  async function loadParticipants(eventId: string) {
    try {
      const data = await apiJson<typeof participants>(`/admin/events/${eventId}/participants`);
      setParticipants(data);
    } catch {
      /* ignore */
    }
  }

  const upcomingEvents = rows.filter((r) => new Date(r.startsAt) > new Date());
  const pastEvents = rows.filter((r) => new Date(r.startsAt) <= new Date());

  return (
    <div className="dashboard-page">
      {/* Katılımcı Modal */}
      {participants && (
        <div className="modal-overlay" onClick={() => setParticipants(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 {participants.eventTitle}</h3>
              <button className="modal-close" onClick={() => setParticipants(null)}>
                ✕
              </button>
            </div>
            <p className="muted">
              {participants.participantCount} / {participants.capacity} katılımcı
            </p>
            {participants.participants.length === 0 ? (
              <p className="muted">Henüz katılımcı yok.</p>
            ) : (
              <div className="members-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ad Soyad</th>
                      <th>E-posta</th>
                      <th>Telefon</th>
                      <th>Kayıt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.participants.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>
                            {p.firstName} {p.lastName}
                          </strong>
                        </td>
                        <td>{p.email}</td>
                        <td>{p.phone || '-'}</td>
                        <td>{new Date(p.registeredAt).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Etkinlik Yönetimi</h1>
          <p className="dashboard-subtitle">Etkinlik oluştur, düzenle ve katılımcıları takip et</p>
        </div>
        <button
          className="btn-primary-lg"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Yeni Etkinlik
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {/* Etkinlik Formu */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>{editId ? '✏️ Etkinlik Düzenle' : '➕ Yeni Etkinlik Oluştur'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>
              Etkinlik Başlığı *{' '}
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
                placeholder="Sunrise Yoga"
              />
            </label>
            <label>
              Kategori
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="general">Genel</option>
                <option value="yoga">Yoga</option>
                <option value="fitness">Fitness</option>
                <option value="outdoor">Outdoor</option>
                <option value="social">Sosyal</option>
                <option value="wellness">Wellness</option>
              </select>
            </label>
            <label>
              Eğitmen / Koç{' '}
              <input
                value={form.coachName}
                onChange={(e) => setForm({ ...form, coachName: e.target.value })}
                placeholder="Grisilda Kola"
              />
            </label>
            <label>
              Konum{' '}
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Skyland Wellness Club"
              />
            </label>
            <label>
              Tarih *{' '}
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                required
              />
            </label>
            <label>
              Başlangıç Saati *{' '}
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </label>
            <label>
              Bitiş Saati{' '}
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </label>
            <label>
              Kapasite{' '}
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Açıklama{' '}
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Etkinlik detayları..."
              />
            </label>
            <label>
              Etkinlik Görseli
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageUpload(f);
                }}
                disabled={uploading}
              />
              {uploading && <span className="muted">⏳ Yükleniyor...</span>}
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt=""
                  style={{ marginTop: 8, maxHeight: 80, borderRadius: 8 }}
                />
              )}
            </label>
            <label className="inlineCheck">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <span>Yayında</span>
            </label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Oluştur'}
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

      {/* Etkinlik Listesi */}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📅</span>
          <p>Henüz etkinlik oluşturmadınız</p>
        </div>
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <div className="dashboard-section">
              <h2 className="section-title">📅 Yaklaşan Etkinlikler ({upcomingEvents.length})</h2>
              <div className="events-grid">
                {upcomingEvents.map((ev) => (
                  <div key={ev.id} className="event-admin-card">
                    {ev.imageUrl && (
                      <div className="event-card-img">
                        <img src={ev.imageUrl} alt={ev.title} />
                      </div>
                    )}
                    <div className="event-card-body">
                      <div className="event-card-top">
                        <h3>{ev.title}</h3>
                        <span
                          className={`status-badge ${ev.published ? 'badge-green' : 'badge-gray'}`}
                        >
                          {ev.published ? 'Yayında' : 'Taslak'}
                        </span>
                      </div>
                      <div className="event-card-meta">
                        <span>📅 {fmtDate(ev.startsAt)}</span>
                        <span>
                          🕐 {fmtTime(ev.startsAt)}
                          {ev.endsAt ? ` - ${fmtTime(ev.endsAt)}` : ''}
                        </span>
                        {ev.coachName && <span>🏋️ {ev.coachName}</span>}
                        {ev.location && <span>📍 {ev.location}</span>}
                        <span>👥 Kapasite: {ev.capacity}</span>
                      </div>
                      <div className="trainer-actions">
                        <button
                          className="btn-sm btn-outline"
                          onClick={() => void loadParticipants(ev.id)}
                        >
                          👥 Katılımcılar
                        </button>
                        <button className="btn-sm btn-outline" onClick={() => openEdit(ev)}>
                          ✏️ Düzenle
                        </button>
                        <button className="btn-sm btn-danger" onClick={() => void remove(ev.id)}>
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="dashboard-section">
              <h2 className="section-title">📋 Geçmiş Etkinlikler ({pastEvents.length})</h2>
              <div className="members-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Etkinlik</th>
                      <th>Tarih</th>
                      <th>Eğitmen</th>
                      <th>Konum</th>
                      <th>Kapasite</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <strong>{ev.title}</strong>
                        </td>
                        <td>{fmtDate(ev.startsAt)}</td>
                        <td>{ev.coachName || '-'}</td>
                        <td>{ev.location || '-'}</td>
                        <td>{ev.capacity}</td>
                        <td>
                          <button
                            className="btn-sm btn-outline"
                            onClick={() => void loadParticipants(ev.id)}
                          >
                            👥
                          </button>
                          <button
                            className="btn-sm btn-danger"
                            onClick={() => void remove(ev.id)}
                            style={{ marginLeft: 4 }}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
