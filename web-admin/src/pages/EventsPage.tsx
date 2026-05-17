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
  participantCount: number;
  published: boolean;
  category: string;
  requirements: string | null;
  price: string;
  currency: string;
  status: string;
  createdAt: string;
};

type Participant = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  registeredAt: string;
  checkedIn?: boolean;
  checkedInAt?: string | null;
};

type ParticipantsData = {
  eventTitle: string;
  capacity: number;
  participantCount: number;
  participants: Participant[];
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

type FilterType = 'all' | 'upcoming' | 'past' | 'draft' | 'pending';

export function EventsPage() {
  const [rows, setRows] = useState<ClubEventAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Katılımcı modal
  const [participantsData, setParticipantsData] = useState<ParticipantsData | null>(null);
  const [participantsEventId, setParticipantsEventId] = useState<string | null>(null);

  // Bildirim modal
  const [notifyEventId, setNotifyEventId] = useState<string | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifySending, setNotifySending] = useState(false);

  // Form
  const [form, setForm] = useState({
    title: '', description: '', coachName: '', location: '', imageUrl: '',
    eventDate: '', startTime: '', endTime: '', capacity: '30',
    published: true, category: 'general', price: '0', requirements: '',
    recurring: false, frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recurringEndDate: '',
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

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  function resetForm() {
    setForm({
      title: '', description: '', coachName: '', location: '', imageUrl: '',
      eventDate: '', startTime: '', endTime: '', capacity: '30',
      published: true, category: 'general', price: '0', requirements: '',
      recurring: false, frequency: 'weekly', recurringEndDate: '',
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
      price: ev.price || '0',
      requirements: ev.requirements || '',
      recurring: false,
      frequency: 'weekly',
      recurringEndDate: '',
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
        setForm((prev) => ({ ...prev, imageUrl: body.url!.startsWith('http') ? body.url! : `${serverBase}${body.url}` }));
      }
    } catch { setError('Görsel yüklenemedi'); }
    finally { setUploading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.eventDate || !form.startTime) { setError('Başlık, tarih ve saat zorunlu'); return; }
    setSaving(true); setError(null);
    try {
      const startsAt = new Date(`${form.eventDate}T${form.startTime}:00`).toISOString();
      const endsAt = form.endTime ? new Date(`${form.eventDate}T${form.endTime}:00`).toISOString() : undefined;
      const payload: Record<string, unknown> = {
        title: form.title, description: form.description || undefined,
        coachName: form.coachName || undefined, location: form.location || undefined,
        imageUrl: form.imageUrl || undefined, startsAt, endsAt,
        capacity: Number(form.capacity) || 30, published: form.published,
        category: form.category, price: parseFloat(form.price) || 0,
        requirements: form.requirements || undefined,
      };
      if (form.recurring && !editId) {
        payload.recurringRule = { frequency: form.frequency, endDate: form.recurringEndDate || undefined };
      }
      if (editId) {
        await apiJson(`/admin/events/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setSuccess('✅ Etkinlik güncellendi');
      } else {
        await apiJson('/admin/events', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('✅ Etkinlik oluşturuldu! Süper admin onayından sonra yayınlanacak.');
      }
      setShowForm(false); resetForm(); await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Hata oluştu'); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try { await apiJson(`/admin/events/${id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Silinemedi'); }
  }

  async function duplicate(id: string) {
    try {
      await apiJson(`/admin/events/${id}/duplicate`, { method: 'POST', body: JSON.stringify({}) });
      setSuccess('✅ Etkinlik kopyalandı (taslak olarak)');
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Kopyalanamadı'); }
  }

  async function loadParticipants(eventId: string) {
    setParticipantsEventId(eventId);
    try {
      const data = await apiJson<ParticipantsData>(`/admin/events/${eventId}/participants`);
      setParticipantsData(data);
    } catch { /* ignore */ }
  }

  async function sendNotification() {
    if (!notifyEventId || !notifyTitle.trim() || !notifyMessage.trim()) return;
    setNotifySending(true);
    try {
      const res = await apiJson<{ sent: number; total: number }>(`/admin/events/${notifyEventId}/notify`, {
        method: 'POST', body: JSON.stringify({ title: notifyTitle, message: notifyMessage }),
      });
      alert(`✅ ${res.sent} kişiye bildirim gönderildi`);
      setNotifyEventId(null); setNotifyTitle(''); setNotifyMessage('');
    } catch (err) { alert(err instanceof ApiError ? err.message : 'Gönderilemedi'); }
    finally { setNotifySending(false); }
  }

  // Filtered events
  const now = new Date();
  const filtered = rows.filter((ev) => {
    if (filter === 'upcoming') return new Date(ev.startsAt) > now && ev.status === 'approved';
    if (filter === 'past') return new Date(ev.startsAt) <= now;
    if (filter === 'draft') return ev.status === 'draft';
    if (filter === 'pending') return ev.status === 'pending_approval';
    return true;
  }).filter((ev) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ev.title.toLowerCase().includes(q) || (ev.coachName?.toLowerCase().includes(q) ?? false) || (ev.category?.toLowerCase().includes(q) ?? false);
  });

  // Stats
  const totalEvents = rows.length;
  const upcomingCount = rows.filter(r => new Date(r.startsAt) > now && r.status === 'approved').length;
  const pendingCount = rows.filter(r => r.status === 'pending_approval').length;
  const draftCount = rows.filter(r => r.status === 'draft').length;
  const totalCapacity = rows.filter(r => new Date(r.startsAt) > now).reduce((s, r) => s + r.capacity, 0);

  return (
    <div className="dashboard-page">
      {/* Katılımcı Modal */}
      {participantsData && (
        <div className="modal-overlay" onClick={() => { setParticipantsData(null); setParticipantsEventId(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 {participantsData.eventTitle}</h3>
              <button className="modal-close" onClick={() => { setParticipantsData(null); setParticipantsEventId(null); }}>✕</button>
            </div>
            <p className="muted">{participantsData.participantCount} / {participantsData.capacity} katılımcı</p>
            {participantsData.participants.length === 0 ? (
              <p className="muted">Henüz katılımcı yok.</p>
            ) : (
              <div className="members-table-wrapper">
                <table className="data-table"><thead><tr><th>Ad Soyad</th><th>E-posta</th><th>Telefon</th><th>Kayıt</th><th>Check-in</th></tr></thead>
                <tbody>{participantsData.participants.map((p) => (
                  <tr key={p.id}><td><strong>{p.firstName} {p.lastName}</strong></td><td>{p.email}</td><td>{p.phone || '-'}</td><td>{new Date(p.registeredAt).toLocaleDateString('tr-TR')}</td>
                  <td>{p.checkedIn ? <span style={{ color: '#059669', fontWeight: 600 }}>✅ {p.checkedInAt ? new Date(p.checkedInAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span> : <button className="btn-sm btn-outline" onClick={async () => { try { await apiJson(`/admin/events/${participantsEventId}/check-in/${p.id}`, { method: 'POST' }); void loadParticipants(participantsEventId!); } catch { /* ignore */ } }}>Giriş</button>}</td></tr>
                ))}</tbody></table>
              </div>
            )}
            {participantsEventId && participantsData.participantCount > 0 && (
              <button className="btn-sm btn-primary" style={{ marginTop: 12 }} onClick={() => { setNotifyEventId(participantsEventId); setParticipantsData(null); setParticipantsEventId(null); }}>
                🔔 Katılımcılara Bildirim Gönder
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bildirim Modal */}
      {notifyEventId && (
        <div className="modal-overlay" onClick={() => setNotifyEventId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>🔔 Katılımcılara Bildirim</h3>
              <button className="modal-close" onClick={() => setNotifyEventId(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <input placeholder="Bildirim Başlığı *" value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }} />
              <textarea placeholder="Mesaj *" value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', resize: 'vertical' }} />
              <button className="btn-sm btn-primary" disabled={notifySending || !notifyTitle.trim() || !notifyMessage.trim()} onClick={() => void sendNotification()}>
                {notifySending ? '⏳ Gönderiliyor...' : '📩 Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Etkinlik Yönetimi</h1>
          <p className="dashboard-subtitle">Etkinlik oluştur, düzenle, katılımcıları takip et</p>
        </div>
        <button className="btn-primary-lg" onClick={() => { resetForm(); setShowForm(true); }}>+ Yeni Etkinlik</button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {/* İstatistik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-mini"><span className="stat-mini-val">{totalEvents}</span><span className="stat-mini-lbl">Toplam</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{upcomingCount}</span><span className="stat-mini-lbl">Yaklaşan</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{pendingCount}</span><span className="stat-mini-lbl">Onay Bekliyor</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{draftCount}</span><span className="stat-mini-lbl">Taslak</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{totalCapacity}</span><span className="stat-mini-lbl">Toplam Kapasite</span></div>
      </div>

      {/* Filtreler */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['upcoming', 'pending', 'past', 'draft', 'all'] as FilterType[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>
            {f === 'upcoming' ? '📅 Yaklaşan' : f === 'pending' ? '⏳ Onay Bekliyor' : f === 'past' ? '📋 Geçmiş' : f === 'draft' ? '📝 Taslak' : '🗂️ Tümü'}
          </button>
        ))}
        <input type="text" placeholder="Ara (başlık, eğitmen, kategori)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', minWidth: 200 }} />
      </div>

      {/* Etkinlik Formu */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>{editId ? '✏️ Etkinlik Düzenle' : '➕ Yeni Etkinlik Oluştur'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>Başlık * <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} placeholder="Sunrise Yoga" /></label>
            <label>Kategori <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
            <label>Eğitmen / Koç <input value={form.coachName} onChange={(e) => setForm({ ...form, coachName: e.target.value })} placeholder="Grisilda Kola" /></label>
            <label>Konum <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Skyland Wellness Club" /></label>
            <label>Tarih * <input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required /></label>
            <label>Başlangıç * <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></label>
            <label>Bitiş <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>
            <label>Kapasite <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></label>
            <label>Ücret (₺) <input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0 = Ücretsiz" /></label>
            <label>Gereksinimler <input value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Yoga matı, havlu, su..." /></label>
            <label style={{ gridColumn: '1 / -1' }}>Açıklama <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Etkinlik detayları..." /></label>
            <label>Görsel <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleImageUpload(f); }} disabled={uploading} />{uploading && <span className="muted">⏳</span>}{form.imageUrl && <img src={form.imageUrl} alt="" style={{ marginTop: 8, maxHeight: 60, borderRadius: 8 }} />}</label>
            <label className="inlineCheck"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /><span>Yayında</span></label>
            {/* Tekrarlayan Etkinlik */}
            {!editId && (
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
            )}
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Oluştur'}</button>
              <button type="button" className="secondary" onClick={() => { setShowForm(false); resetForm(); }}>İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Etkinlik Listesi */}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">📅</span><p>{searchQuery ? 'Aramayla eşleşen etkinlik yok' : 'Bu kategoride etkinlik yok'}</p></div>
      ) : (
        <div className="events-grid">
          {filtered.map((ev) => {
            const isPast = new Date(ev.startsAt) <= now;
            const priceNum = parseFloat(ev.price) || 0;
            return (
              <div key={ev.id} className="event-admin-card" style={{ opacity: isPast ? 0.7 : 1 }}>
                {ev.imageUrl && <div className="event-card-img"><img src={ev.imageUrl} alt={ev.title} /></div>}
                <div className="event-card-body">
                  <div className="event-card-top">
                    <h3>{ev.title}</h3>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {ev.status === 'pending_approval' && <span className="status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>Onay Bekliyor</span>}
                      {ev.status === 'approved' && !isPast && <span className="status-badge badge-green">Yayında</span>}
                      {ev.status === 'rejected' && <span className="status-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Reddedildi</span>}
                      {ev.status === 'draft' && <span className="status-badge badge-gray">Taslak</span>}
                      {isPast && ev.status === 'approved' && <span className="status-badge badge-gray">Tamamlandı</span>}
                    </div>
                  </div>
                  <div className="event-card-meta">
                    <span>📅 {fmtDate(ev.startsAt)}</span>
                    <span>🕐 {fmtTime(ev.startsAt)}{ev.endsAt ? ` - ${fmtTime(ev.endsAt)}` : ''}</span>
                    {ev.coachName && <span>🏋️ {ev.coachName}</span>}
                    {ev.location && <span>📍 {ev.location}</span>}
                    <span>👥 {ev.participantCount}/{ev.capacity}</span>
                    {priceNum > 0 && <span>💰 ₺{priceNum.toLocaleString('tr-TR')}</span>}
                    {priceNum === 0 && <span style={{ color: '#059669', fontWeight: 600 }}>Ücretsiz</span>}
                    {ev.requirements && <span>📋 {ev.requirements}</span>}
                  </div>
                  <div className="trainer-actions" style={{ marginTop: 8 }}>
                    <button className="btn-sm btn-outline" onClick={() => void loadParticipants(ev.id)}>👥 Katılımcılar</button>
                    <button className="btn-sm btn-outline" onClick={() => openEdit(ev)}>✏️</button>
                    <button className="btn-sm btn-outline" onClick={() => void duplicate(ev.id)} title="Kopyala">📋</button>
                    <button className="btn-sm btn-outline" onClick={() => { setNotifyEventId(ev.id); }} title="Bildirim">🔔</button>
                    <button className="btn-sm btn-danger" onClick={() => void remove(ev.id)}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
