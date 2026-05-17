import { useCallback, useEffect, useState, type FormEvent } from 'react';
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
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Taslak', color: '#475569', bg: '#f1f5f9' },
  pending_approval: { label: 'Onay Bekliyor', color: '#92400e', bg: '#fef3c7' },
  approved: { label: 'Onaylandı', color: '#166534', bg: '#dcfce7' },
  rejected: { label: 'Reddedildi', color: '#991b1b', bg: '#fee2e2' },
  cancelled: { label: 'İptal', color: '#64748b', bg: '#f1f5f9' },
};

const CATEGORIES = [
  { value: 'general', label: 'Genel' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'social', label: 'Sosyal' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminer' },
];

export function TrainerEventsPage() {
  const [events, setEvents] = useState<TrainerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', location: '', category: 'general',
    eventDate: '', startTime: '', endTime: '', capacity: '20',
    price: '0', requirements: '',
    recurring: false, frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurringEndDate: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { setEvents(await apiJson<TrainerEvent[]>('/trainer/events')); }
    catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.eventDate || !form.startTime) { setError('Başlık, tarih ve saat zorunlu'); return; }
    setSaving(true); setError(null);
    try {
      const startsAt = new Date(`${form.eventDate}T${form.startTime}:00`).toISOString();
      const endsAt = form.endTime ? new Date(`${form.eventDate}T${form.endTime}:00`).toISOString() : undefined;
      const payload: Record<string, unknown> = {
        title: form.title, description: form.description || undefined,
        location: form.location || 'Online', startsAt, endsAt,
        capacity: Number(form.capacity) || 20, category: form.category,
        price: parseFloat(form.price) || 0, requirements: form.requirements || undefined,
      };
      if (form.recurring) {
        payload.recurringRule = {
          frequency: form.frequency,
          endDate: form.recurringEndDate || undefined,
        };
      }
      await apiJson('/trainer/events', { method: 'POST', body: JSON.stringify(payload) });
      setSuccess('✅ Etkinlik oluşturuldu! Süper admin onayından sonra yayınlanacak.');
      setShowForm(false);
      setForm({ title: '', description: '', location: '', category: 'general', eventDate: '', startTime: '', endTime: '', capacity: '20', price: '0', requirements: '', recurring: false, frequency: 'weekly', recurringEndDate: '' });
      await load();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Hata oluştu'); }
    finally { setSaving(false); }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Etkinliklerim</h1>
          <p className="dashboard-subtitle">Etkinlik oluştur ve takip et (onay gerektirir)</p>
        </div>
        <button className="btn-primary-lg" onClick={() => setShowForm(true)}>+ Etkinlik Oluştur</button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>➕ Yeni Etkinlik</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '-4px 0 16px' }}>
            ⚠️ Oluşturduğunuz etkinlik süper admin onayından sonra yayınlanacaktır.
          </p>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>Başlık * <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="Grup Yoga Dersi" /></label>
            <label>Kategori <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
            <label>Konum * <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required placeholder="Park / Stüdyo / Online" /></label>
            <label>Tarih * <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required /></label>
            <label>Başlangıç * <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></label>
            <label>Bitiş <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>
            <label>Kapasite <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></label>
            <label>Ücret (₺) <input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0 = Ücretsiz" /></label>
            <label>Gereksinimler <input value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Mat, havlu, su..." /></label>
            <label style={{ gridColumn: '1 / -1' }}>Açıklama <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Etkinlik detayları..." /></label>
            
            {/* Tekrarlayan */}
            <div style={{ gridColumn: '1 / -1', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface, #fafafa)' }}>
              <label className="inlineCheck" style={{ marginBottom: 8 }}>
                <input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} />
                <span style={{ fontWeight: 600 }}>🔁 Tekrarlayan Etkinlik</span>
              </label>
              {form.recurring && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <label style={{ flex: 1 }}>Sıklık <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}>
                    <option value="daily">Her Gün</option>
                    <option value="weekly">Her Hafta</option>
                    <option value="monthly">Her Ay</option>
                  </select></label>
                  <label style={{ flex: 1 }}>Bitiş Tarihi <input type="date" value={form.recurringEndDate} onChange={(e) => setForm({ ...form, recurringEndDate: e.target.value })} /></label>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Gönderiliyor...' : 'Onaya Gönder'}</button>
              <button type="button" className="secondary" onClick={() => setShowForm(false)}>İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Etkinlik Listesi */}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : events.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">📅</span><p>Henüz etkinlik oluşturmadınız</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map((ev) => {
            const st = STATUS_LABELS[ev.status] || STATUS_LABELS.draft;
            return (
              <div key={ev.id} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{ev.title}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    📅 {new Date(ev.startsAt).toLocaleDateString('tr-TR')} · 🕐 {new Date(ev.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    {ev.location && ` · 📍 ${ev.location}`}
                    · 👥 {ev.capacity}
                    {parseFloat(ev.price) > 0 && ` · 💰 ₺${parseFloat(ev.price).toLocaleString('tr-TR')}`}
                  </p>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
