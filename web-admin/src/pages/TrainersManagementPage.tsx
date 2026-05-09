import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type TrainerRow = {
  id: string;
  userId: string;
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

const SESSION_TYPE_OPTIONS = [
  { value: 'personal_training', label: 'Personal Training' },
  { value: 'massage', label: 'Masaj' },
];

export function TrainersManagementPage() {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedStats, setSelectedStats] = useState<{ id: string; stats: TrainerStats } | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    bio: '',
    specializations: '',
    certifications: '',
    offersSessionTypes: ['personal_training'] as string[],
    photoUrl: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<TrainerRow[]>('/admin/trainers');
      setTrainers(data);
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

  function resetForm() {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      bio: '',
      specializations: '',
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
      specializations: ((t.specializations as string[]) || []).join(', '),
      certifications: ((t.certifications as string[]) || []).join(', '),
      offersSessionTypes: t.offersSessionTypes || ['personal_training'],
      photoUrl: t.photoUrl || '',
    });
    setEditId(t.id);
    setShowForm(true);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100/api/v1';
      const res = await fetch(`${baseUrl}/auth/upload-image`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        const serverBase = baseUrl.replace('/api/v1', '');
        const fullUrl = body.url.startsWith('http') ? body.url : `${serverBase}${body.url}`;
        setForm((prev) => ({ ...prev, photoUrl: fullUrl }));
      }
    } catch {
      alert('Fotoğraf yüklenemedi');
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
        specializations: form.specializations
          ? form.specializations
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
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
      } else {
        if (!form.password) {
          setError('Şifre zorunludur');
          setSaving(false);
          return;
        }
        await apiJson('/admin/trainers', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      resetForm();
      await load();
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Silme başarısız');
    }
  }

  async function loadStats(trainerId: string) {
    try {
      const stats = await apiJson<TrainerStats>(`/admin/trainers/${trainerId}/stats`);
      setSelectedStats({ id: trainerId, stats });
    } catch {
      // ignore
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Eğitmen Yönetimi</h1>
          <p className="dashboard-subtitle">
            Eğitmenleri ekle, düzenle, sil ve performanslarını takip et
          </p>
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

      {/* Eğitmen Ekleme/Düzenleme Formu */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editId ? '✏️ Eğitmen Düzenle' : '➕ Yeni Eğitmen Ekle'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} className="form-grid">
            <label>
              Ad *
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
              />
            </label>
            <label>
              Soyad *
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </label>
            <label>
              E-posta *
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                disabled={!!editId}
              />
            </label>
            <label>
              Telefon
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="05XX XXX XX XX"
              />
            </label>
            {!editId && (
              <label>
                Şifre *
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
              Biyografi
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={2}
                placeholder="Eğitmen hakkında kısa bilgi..."
              />
            </label>
            <label>
              Uzmanlık Alanları (virgülle ayırın)
              <input
                value={form.specializations}
                onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                placeholder="Fitness, Pilates, Yoga"
              />
            </label>
            <label>
              Sertifikalar (virgülle ayırın)
              <input
                value={form.certifications}
                onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                placeholder="ACE, NASM, Pilates Mat"
              />
            </label>
            <label>
              Hizmet Türleri
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {SESSION_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
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
                      checked={form.offersSessionTypes.includes(opt.value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...form.offersSessionTypes, opt.value]
                          : form.offersSessionTypes.filter((v) => v !== opt.value);
                        setForm({ ...form, offersSessionTypes: next });
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </label>
            <label>
              Fotoğraf
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImageUpload(f);
                  }}
                  disabled={uploading}
                />
                {uploading && <span className="muted">Yükleniyor...</span>}
              </div>
              {form.photoUrl && (
                <img
                  src={form.photoUrl}
                  alt="Eğitmen"
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

      {/* Eğitmen Listesi */}
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
            <div key={t.id} className="trainer-card">
              <div className="trainer-card-header">
                <div className="trainer-avatar-lg">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} alt={t.firstName} />
                  ) : (
                    <span>
                      {t.firstName[0]}
                      {t.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="trainer-card-info">
                  <h3>
                    {t.firstName} {t.lastName}
                  </h3>
                  <p className="trainer-email">{t.email}</p>
                  {t.phone && <p className="trainer-phone">📞 {t.phone}</p>}
                </div>
                <div className="trainer-rating">
                  <span className="rating-star">⭐</span>
                  <span>{Number(t.avgRating).toFixed(1)}</span>
                </div>
              </div>

              <div className="trainer-card-body">
                <div className="trainer-tags">
                  {t.offersSessionTypes?.map((st) => (
                    <span key={st} className="tag">
                      {st === 'personal_training' ? 'PT' : st === 'massage' ? 'Masaj' : st}
                    </span>
                  ))}
                </div>
                {t.specializations && (t.specializations as string[]).length > 0 && (
                  <div className="trainer-specs">
                    {(t.specializations as string[]).map((s, i) => (
                      <span key={i} className="spec-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="trainer-stats-row">
                  <span>📊 {t.totalSessions} seans</span>
                  <span>📅 {new Date(t.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {/* İstatistikler */}
              {selectedStats?.id === t.id && (
                <div className="trainer-detail-panel">
                  <h4>📈 Performans İstatistikleri</h4>
                  <div className="mini-stats">
                    <span>
                      ✅ Tamamlanan: <strong>{selectedStats.stats.completedSessions}</strong>
                    </span>
                    <span>
                      📋 Onaylı: <strong>{selectedStats.stats.confirmedSessions}</strong>
                    </span>
                    <span>
                      ❌ İptal: <strong>{selectedStats.stats.cancelledSessions}</strong>
                    </span>
                    <span>
                      📅 Bu Ay: <strong>{selectedStats.stats.thisMonthSessions}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Aksiyon Butonları */}
              <div className="trainer-actions">
                <button className="btn-sm btn-outline" onClick={() => void loadStats(t.id)}>
                  📊 İstatistik
                </button>
                <button className="btn-sm btn-outline" onClick={() => openEdit(t)}>
                  ✏️ Düzenle
                </button>
                <button className="btn-sm btn-danger" onClick={() => void handleDelete(t.id)}>
                  🗑 Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
