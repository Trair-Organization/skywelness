import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { apiBaseUrl } from '../lib/config';

type SpaServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  sortOrder: number;
};
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
type SpaBookingRow = {
  id: string;
  bookingDate: string;
  timeSlot: string;
  status: string;
  notes: string | null;
  adminNote: string | null;
  service: { id: string; name: string } | null;
  therapist: { id: string; name: string } | null;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
};

type TabType = 'therapists' | 'services' | 'bookings';
type ViewMode = 'list' | 'schedule';

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function SpaManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('therapists');
  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [bookings, setBookings] = useState<SpaBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState('pending');

  // Masöz CRUD
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', bio: '', specialties: '', photoUrl: '' });

  // Ajanda
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [scheduleTherapist, setScheduleTherapist] = useState<TherapistRow | null>(null);
  const [therapistHours, setTherapistHours] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [svc, th, bk] = await Promise.all([
        apiJson<SpaServiceRow[]>('/spa/admin/services'),
        apiJson<TherapistRow[]>('/spa/admin/therapists'),
        apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${bookingFilter}`),
      ]);
      setServices(svc);
      setTherapists(th);
      setBookings(bk);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [bookingFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  // ─── Masöz CRUD ───────────────────────────────────────────────────────────────
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
        const fullUrl = body.url.startsWith('http') ? body.url : `${serverBase}${body.url}`;
        setForm((prev) => ({ ...prev, photoUrl: fullUrl }));
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
      await loadAll();
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
      await loadAll();
      setSuccess('✅ Masöz silindi');
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
    await loadAll();
  }

  // ─── Ajanda ───────────────────────────────────────────────────────────────────
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
      await loadAll();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    }
  }

  // ─── Booking ──────────────────────────────────────────────────────────────────
  async function updateBookingStatus(id: string, status: string) {
    try {
      await apiJson(`/spa/admin/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const data = await apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${bookingFilter}`);
      setBookings(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
    }
  }

  function getStatusLabel(s: string) {
    return (
      { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' }[
        s
      ] || s
    );
  }
  function getCategoryLabel(c: string) {
    return (
      {
        relax: '🧘 Relax',
        therapy: '💆 Therapy',
        recovery: '🔄 Recovery',
        sport: '⚡ Sport',
        premium: '👑 Premium',
      }[c] || c
    );
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

        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button className="btn-primary-lg" onClick={() => void saveSchedule()}>
            💾 Kaydet ve Dön
          </button>
          <button className="btn-sm btn-outline" onClick={() => setViewMode('list')}>
            İptal
          </button>
          <button
            className="btn-sm btn-outline"
            onClick={() => {
              const preset: Record<string, string> = {};
              DAY_KEYS.forEach((k, i) => {
                if (i < 6) preset[k] = '10:00-20:00';
              });
              setTherapistHours(preset);
            }}
          >
            📋 Varsayılan (Pzt-Cmt 10-20)
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANA GÖRÜNÜM
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Spa & Wellness Yönetimi</h1>
          <p className="dashboard-subtitle">Masözler, hizmetler ve rezervasyonları yönetin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'therapists' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('therapists')}
          >
            💆 Masözler ({therapists.length})
          </button>
          <button
            className={`filter-tab ${activeTab === 'bookings' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📝 Rezervasyonlar
          </button>
          <button
            className={`filter-tab ${activeTab === 'services' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            🧴 Hizmetler ({services.length})
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success-msg">{success}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && (
        <>
          {/* ─── MASÖZLER TAB ─── */}
          {activeTab === 'therapists' && (
            <div>
              <div style={{ marginBottom: 16 }}>
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
                        placeholder="Masöz hakkında..."
                      />
                    </label>
                    <label>
                      Uzmanlık Alanları{' '}
                      <input
                        value={form.specialties}
                        onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                        placeholder="Klasik Masaj, Bali, Aroma"
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
              {therapists.length === 0 ? (
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
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.name} />
                          ) : (
                            <span>{t.name[0]}</span>
                          )}
                        </div>
                        <div className="trainer-card-info">
                          <h3>{t.name}</h3>
                          {t.bio && (
                            <p className="trainer-email">
                              {t.bio.slice(0, 50)}
                              {t.bio.length > 50 ? '...' : ''}
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
                        {/* Çalışma Saatleri Özet */}
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
                        <button
                          className="btn-sm btn-danger"
                          onClick={() => void handleDelete(t.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── REZERVASYONLAR TAB ─── */}
          {activeTab === 'bookings' && (
            <div>
              <div className="booking-filters">
                {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    className={`btn-sm ${bookingFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setBookingFilter(s);
                      void apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${s}`).then(
                        setBookings,
                      );
                    }}
                  >
                    {getStatusLabel(s)}
                  </button>
                ))}
              </div>
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>Bu durumda rezervasyon yok</p>
                </div>
              ) : (
                <div className="members-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Üye</th>
                        <th>Hizmet</th>
                        <th>Masöz</th>
                        <th>Tarih</th>
                        <th>Saat</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.user ? `${b.user.firstName} ${b.user.lastName}` : '-'}</td>
                          <td>{b.service?.name || '-'}</td>
                          <td>{b.therapist?.name || '-'}</td>
                          <td>{b.bookingDate}</td>
                          <td>{b.timeSlot}</td>
                          <td>
                            <span className={`status-badge status-spa-${b.status}`}>
                              {getStatusLabel(b.status)}
                            </span>
                          </td>
                          <td>
                            {b.status === 'pending' && (
                              <div className="action-btns">
                                <button
                                  className="btn-sm btn-success"
                                  onClick={() => void updateBookingStatus(b.id, 'confirmed')}
                                >
                                  ✓ Onayla
                                </button>
                                <button
                                  className="btn-sm btn-danger"
                                  onClick={() => void updateBookingStatus(b.id, 'cancelled')}
                                >
                                  ✗ İptal
                                </button>
                              </div>
                            )}
                            {b.status === 'confirmed' && (
                              <button
                                className="btn-sm btn-success"
                                onClick={() => void updateBookingStatus(b.id, 'completed')}
                              >
                                ✓ Tamamlandı
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── HİZMETLER TAB ─── */}
          {activeTab === 'services' && (
            <div className="services-grid">
              {services.map((s) => (
                <div key={s.id} className="service-card">
                  <div className="service-card-header">
                    <span className="service-category">{getCategoryLabel(s.category)}</span>
                    <span className={`service-status ${s.active ? 'active' : 'inactive'}`}>
                      {s.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <h3 className="service-name">{s.name}</h3>
                  {s.description && (
                    <p className="service-desc">{s.description.slice(0, 100)}...</p>
                  )}
                  <div className="service-meta">
                    <span>⏱ {s.durationMinutes} dk</span>
                    <span className="service-price">₺{s.price.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
