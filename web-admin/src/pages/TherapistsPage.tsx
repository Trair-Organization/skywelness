import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { apiBaseUrl } from '../lib/config';

type TherapistRow = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  phone: string | null;
  specialties: string[] | null;
  workingHours: Record<string, string> | null;
  avgRating: string;
  totalSessions: number;
  active: boolean;
};

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

type ViewMode = 'list' | 'schedule';

export function TherapistsPage() {
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // CRUD
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', bio: '', specialties: '', photoUrl: '' });

  // Ajanda
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [scheduleTherapist, setScheduleTherapist] = useState<TherapistRow | null>(null);
  const [therapistHours, setTherapistHours] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TherapistRow[]>('/spa/admin/therapists');
      setTherapists(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // ─── CRUD ─────────────────────────────────────────────────────────────────────
  function resetForm() {
    setForm({ name: '', phone: '', bio: '', specialties: '', photoUrl: '' });
    setEditId(null);
  }

  function openEdit(t: TherapistRow) {
    setForm({
      name: t.name,
      phone: t.phone || '',
      bio: t.bio || '',
      specialties: (t.specialties || []).join(', '),
      photoUrl: t.photoUrl || '',
    });
    setEditId(t.id);
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
          photoUrl: body.url!.startsWith('http') ? body.url! : `${serverBase}${body.url}`,
        }));
        setSuccess('✅ Fotoğraf yüklendi');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch {
      setError('Fotoğraf yüklenemedi');
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
        name: form.name,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        specialties: form.specialties
          ? form.specialties
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        photoUrl: form.photoUrl || undefined,
      };
      if (editId) {
        await apiJson(`/spa/admin/therapists/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setSuccess('✅ Masöz güncellendi');
      } else {
        await apiJson('/spa/admin/therapists', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('✅ Masöz eklendi');
      }
      setShowForm(false);
      resetForm();
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Hata');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu masözü silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/spa/admin/therapists/${id}`, { method: 'DELETE' });
      await load();
      setSuccess('✅ Silindi');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Silinemedi');
    }
  }

  async function toggleActive(t: TherapistRow) {
    await apiJson(`/spa/admin/therapists/${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !t.active }),
    });
    await load();
  }

  // ─── AJANDA ───────────────────────────────────────────────────────────────────
  function openSchedule(t: TherapistRow) {
    setScheduleTherapist(t);
    setTherapistHours(t.workingHours || {});
    setViewMode('schedule');
  }

  async function saveSchedule() {
    if (!scheduleTherapist) return;
    try {
      await apiJson(`/admin/therapists/${scheduleTherapist.id}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ workingHours: therapistHours }),
      });
      setSuccess('✅ Çalışma saatleri kaydedildi');
      setViewMode('list');
      await load();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // AJANDA GÖRÜNÜMÜ
  // ═══════════════════════════════════════════════════════════════════════════════
  if (viewMode === 'schedule' && scheduleTherapist) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <button className="btn-back" onClick={() => setViewMode('list')}>
              ← Masözlere Dön
            </button>
            <h1 className="dashboard-title">{scheduleTherapist.name} — Çalışma Saatleri</h1>
            <p className="dashboard-subtitle">
              Her gün için çalışma saatlerini belirleyin. Kullanıcılar sadece bu saatler içinde
              randevu alabilir.
            </p>
          </div>
          <button className="btn-primary-lg" onClick={() => void saveSchedule()}>
            💾 Kaydet
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        <div className="schedule-info-banner">
          <span>💡</span>
          <p>
            Format: <code>10:00-20:00</code> — Boş bırakırsanız o gün kapalı olur. Birden fazla
            aralık: <code>09:00-12:00, 14:00-20:00</code>
          </p>
        </div>

        <div className="therapist-schedule-edit-grid">
          {DAY_KEYS.map((key, i) => (
            <div key={key} className="schedule-day-card">
              <div className="schedule-day-label">{DAYS[i]}</div>
              <input
                type="text"
                value={therapistHours[key] || ''}
                onChange={(e) => setTherapistHours({ ...therapistHours, [key]: e.target.value })}
                placeholder="Kapalı"
                className="schedule-day-input"
              />
              <div className="schedule-day-status">
                {therapistHours[key] ? (
                  <span className="text-green">● Açık</span>
                ) : (
                  <span className="text-red">● Kapalı</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary-lg" onClick={() => void saveSchedule()}>
            💾 Kaydet ve Dön
          </button>
          <button className="btn-sm btn-outline" onClick={() => setViewMode('list')}>
            İptal
          </button>
          <button
            className="btn-sm btn-outline"
            onClick={() => {
              const p: Record<string, string> = {};
              DAY_KEYS.forEach((k, i) => {
                if (i < 6) p[k] = '10:00-20:00';
              });
              setTherapistHours(p);
            }}
          >
            📋 Varsayılan (Pzt-Cmt 10-20)
          </button>
          <button
            className="btn-sm btn-outline"
            onClick={() => {
              const p: Record<string, string> = {};
              DAY_KEYS.forEach((k) => {
                p[k] = '10:00-20:00';
              });
              setTherapistHours(p);
            }}
          >
            📋 Her Gün 10-20
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LİSTE GÖRÜNÜMÜ
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Masöz Yönetimi</h1>
          <p className="dashboard-subtitle">Masözleri ekle, düzenle, ajandalarını yönet</p>
        </div>
        <button
          className="btn-primary-lg"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Yeni Masöz Ekle
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>{editId ? '✏️ Masöz Düzenle' : '➕ Yeni Masöz Ekle'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>
              Ad Soyad *{' '}
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Vinda"
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
            <label>
              Biyografi{' '}
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={2}
                placeholder="Masöz hakkında kısa bilgi..."
              />
            </label>
            <label>
              Uzmanlık Alanları (virgülle ayırın){' '}
              <input
                value={form.specialties}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                placeholder="Klasik Masaj, Bali, Aroma Terapi"
              />
            </label>
            <label>
              Fotoğraf
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
              {form.photoUrl && (
                <img
                  src={form.photoUrl}
                  alt=""
                  style={{ marginTop: 8, maxHeight: 60, borderRadius: 8 }}
                />
              )}
            </label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
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

      {/* Masöz Kartları */}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : therapists.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💆</span>
          <p>Henüz masöz eklenmemiş</p>
        </div>
      ) : (
        <div className="trainers-grid">
          {therapists.map((t) => (
            <div key={t.id} className="trainer-card">
              <div className="trainer-card-header">
                <div className="trainer-avatar-lg">
                  {t.photoUrl ? <img src={t.photoUrl} alt={t.name} /> : <span>{t.name[0]}</span>}
                </div>
                <div className="trainer-card-info">
                  <h3>{t.name}</h3>
                  {t.phone && <p className="trainer-phone">📞 {t.phone}</p>}
                  {t.bio && (
                    <p className="trainer-email">
                      {t.bio.slice(0, 60)}
                      {t.bio.length > 60 ? '...' : ''}
                    </p>
                  )}
                </div>
                <div className="trainer-rating">
                  <span className="rating-star">⭐</span>
                  <span>{Number(t.avgRating).toFixed(1)}</span>
                </div>
              </div>

              <div className="trainer-card-body">
                {t.specialties && t.specialties.length > 0 && (
                  <div className="trainer-tags">
                    {t.specialties.map((sp, i) => (
                      <span key={i} className="tag">
                        {sp}
                      </span>
                    ))}
                  </div>
                )}
                {/* Mini Haftalık Program */}
                <div className="wh-mini-display">
                  {DAY_KEYS.map((key, i) => (
                    <span
                      key={key}
                      className={`wh-mini-cell ${t.workingHours?.[key] ? 'wh-mini-open' : ''}`}
                      title={`${DAYS[i]}: ${t.workingHours?.[key] || 'Kapalı'}`}
                    >
                      {DAYS[i].slice(0, 2)}
                    </span>
                  ))}
                </div>
                <div className="trainer-stats-row">
                  <span>{t.active ? '🟢 Aktif' : '🔴 Pasif'}</span>
                  <span>📊 {t.totalSessions || 0} seans</span>
                </div>
              </div>

              {/* Butonlar */}
              <div className="trainer-actions">
                <button className="btn-sm btn-schedule" onClick={() => openSchedule(t)}>
                  🗓️ Ajanda
                </button>
                <button className="btn-sm btn-outline" onClick={() => openEdit(t)}>
                  ✏️ Düzenle
                </button>
                <button className="btn-sm btn-outline" onClick={() => void toggleActive(t)}>
                  {t.active ? '⏸ Pasif' : '▶ Aktif'}
                </button>
                <button className="btn-sm btn-danger" onClick={() => void handleDelete(t.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
