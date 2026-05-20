import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { CITY_LIST } from '@rezidans-fitness/shared';

type TrainerProfileData = {
  trainerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  publicId: string | null;
  bio: string;
  specialties: string[];
  certifications: string[];
  experienceYears: number | null;
  city: string;
  photoUrl: string | null;
  pricingNote: string | null;
  offersSessionTypes: string[];
  avgRating: string;
  totalSessions: number;
  defaultLessonPrice: string;
  commissionRate: string;
  awayUntil: string | null;
  awayMessage: string | null;
  verified: boolean;
};

const SPECIALTY_SUGGESTIONS = [
  'Fitness',
  'Personal Training',
  'Pilates',
  'Yoga',
  'CrossFit',
  'Boks',
  'Kickboks',
  'MMA',
  'Atletik Performans',
  'Kuvvet & Kondisyon',
  'Mobilite',
  'Postür Düzeltici',
  'Rehabilitasyon',
  'Hipertrofi',
  'Kilo Verme',
  'Beslenme Danışmanlığı',
  'Yüzme',
  'Koşu',
  'TRX',
  'Padel',
];

const SESSION_TYPE_OPTIONS = [
  { value: 'personal_training', label: '🏋️ Personal Training' },
  { value: 'massage', label: '💆 Masaj' },
];

export function TrainerProfileEditPage() {
  const [profile, setProfile] = useState<TrainerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState<string>('');
  const [pricingNote, setPricingNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [awayUntil, setAwayUntil] = useState('');
  const [awayMessage, setAwayMessage] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [offersSessionTypes, setOffersSessionTypes] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TrainerProfileData>('/trainer-panel/profile');
      setProfile(data);
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setPhone(data.phone ?? '');
      setCity(data.city ?? '');
      setBio(data.bio ?? '');
      setExperienceYears(data.experienceYears !== null ? String(data.experienceYears) : '');
      setPricingNote(data.pricingNote ?? '');
      setPhotoUrl(data.photoUrl ?? '');
      setAwayUntil(data.awayUntil ?? '');
      setAwayMessage(data.awayMessage ?? '');
      setSpecialties(data.specialties ?? []);
      setCertifications(data.certifications ?? []);
      setOffersSessionTypes(data.offersSessionTypes ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Profil yüklenemedi');
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
    setTimeout(() => setSuccess(null), 3000);
  }

  function flashError(msg: string) {
    setError(msg);
    setSuccess(null);
    setTimeout(() => setError(null), 4000);
  }

  function addSpecialty(value: string) {
    const v = value.trim();
    if (!v) return;
    if (specialties.includes(v)) return;
    setSpecialties((prev) => [...prev, v]);
    setNewSpecialty('');
  }
  function removeSpecialty(v: string) {
    setSpecialties((prev) => prev.filter((s) => s !== v));
  }
  function addCertification(value: string) {
    const v = value.trim();
    if (!v) return;
    if (certifications.includes(v)) return;
    setCertifications((prev) => [...prev, v]);
    setNewCert('');
  }
  function removeCertification(v: string) {
    setCertifications((prev) => prev.filter((c) => c !== v));
  }
  function toggleSessionType(t: string) {
    setOffersSessionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      flashError('Ad ve soyad zorunludur');
      return;
    }
    setSaving(true);
    try {
      await apiJson('/trainer-panel/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          city: city.trim() || undefined,
          bio: bio.trim() || undefined,
          experienceYears: experienceYears ? parseInt(experienceYears) : undefined,
          pricingNote: pricingNote.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          awayUntil: awayUntil || null,
          awayMessage: awayMessage.trim() || null,
          specialties,
          certifications,
          offersSessionTypes,
        }),
      });
      flash('✅ Profil güncellendi');
      await load();
    } catch (e) {
      flashError(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPhoto(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiJson<{ url: string }>('/auth/upload-avatar', {
        method: 'POST',
        body: formData,
        headers: undefined,
      });
      const fullUrl = res.url.startsWith('http')
        ? res.url
        : `https://www.wellnessclub.tech${res.url}`;
      setPhotoUrl(fullUrl);
      flash('✅ Fotoğraf yüklendi (otomatik kare kırpıldı)');
    } catch (e) {
      flashError(e instanceof ApiError ? e.message : 'Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="trainer-profile-edit">
        <p className="muted">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="trainer-profile-edit">
      <div className="profile-edit-header">
        <div>
          <h1>🏋️ Profilim</h1>
          <p className="muted">Bilgilerinizi güncelleyin — keşif sayfasında görünür.</p>
        </div>
        <button
          className="btn-primary profile-save-btn"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>

      {success && <div className="profile-banner profile-banner-success">{success}</div>}
      {error && <div className="profile-banner profile-banner-error">⚠️ {error}</div>}

      {/* Üst stat şeridi */}
      {profile && (
        <div className="profile-stats-row">
          <div className="profile-stat">
            <span className="profile-stat-icon">⭐</span>
            <div>
              <strong>{Number(profile.avgRating).toFixed(1)}</strong>
              <span>Ortalama Puan</span>
            </div>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-icon">🏋️</span>
            <div>
              <strong>{profile.totalSessions}</strong>
              <span>Toplam Seans</span>
            </div>
          </div>
          {profile.publicId && (
            <div className="profile-stat">
              <span className="profile-stat-icon">🆔</span>
              <div>
                <strong>{profile.publicId}</strong>
                <span>Eğitmen ID</span>
              </div>
            </div>
          )}
          {profile.verified && (
            <div className="profile-stat profile-stat-verified">
              <span className="profile-stat-icon">✅</span>
              <div>
                <strong>Doğrulandı</strong>
                <span>Sertifika onaylı</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tatildeyim banner */}
      {awayUntil && new Date(awayUntil) >= new Date(new Date().toISOString().slice(0, 10)) && (
        <div className="away-banner">
          🏖️ <strong>Tatil modunda</strong> — {new Date(awayUntil).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} tarihine kadar.
          {awayMessage && <span> "{awayMessage}"</span>}
        </div>
      )}

      <div className="profile-edit-grid">
        {/* SOL — Kişisel Bilgiler + Fotoğraf */}
        <div className="profile-edit-col">
          <section className="profile-card">
            <h2 className="profile-card-title">🖼️ Profil Fotoğrafı</h2>
            <div className="profile-photo-row">
              <div className="profile-photo-preview">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profil" />
                ) : (
                  <span className="profile-photo-placeholder">
                    {firstName.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="profile-photo-actions">
                <label className="btn-outline btn-sm profile-photo-upload-btn">
                  {uploading ? '⏳ Yükleniyor...' : '📷 Fotoğraf Yükle'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadPhoto(f);
                    }}
                    disabled={uploading}
                  />
                </label>
                {photoUrl && (
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => setPhotoUrl('')}
                  >
                    Kaldır
                  </button>
                )}
                <p className="profile-hint">
                  Otomatik kare kırpılır (800x800). Herhangi bir boyut yükleyebilirsiniz.
                </p>
              </div>
            </div>
          </section>

          <section className="profile-card">
            <h2 className="profile-card-title">👤 Kişisel Bilgiler</h2>
            <div className="profile-grid-2">
              <label className="profile-field">
                <span>Ad *</span>
                <input
                  type="text"
                  className="profile-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label className="profile-field">
                <span>Soyad *</span>
                <input
                  type="text"
                  className="profile-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="profile-field">
              <span>E-posta</span>
              <input
                type="email"
                className="profile-input"
                value={profile?.email ?? ''}
                disabled
                title="E-posta değiştirilemez"
              />
              <small className="profile-hint">E-posta değiştirmek için yöneticinize başvurun.</small>
            </label>
            <div className="profile-grid-2">
              <label className="profile-field">
                <span>Telefon</span>
                <input
                  type="tel"
                  className="profile-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+90 5XX XXX XX XX"
                />
              </label>
              <label className="profile-field">
                <span>Şehir</span>
                <select
                  className="profile-input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">Seçin...</option>
                  {CITY_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="profile-field">
              <span>Deneyim (yıl)</span>
              <input
                type="number"
                className="profile-input"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                min={0}
                max={50}
                placeholder="ör: 5"
              />
            </label>
          </section>
        </div>

        {/* SAĞ — Profesyonel Bilgiler */}
        <div className="profile-edit-col">
          <section className="profile-card">
            <h2 className="profile-card-title">📝 Hakkımda</h2>
            <textarea
              className="profile-input profile-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={6}
              placeholder="Kendinizi tanıtın, deneyimlerinizi ve eğitim yaklaşımınızı yazın..."
            />
            <small className="profile-hint">
              Bu metin keşif sayfasında ve profilinizde görünür. Min 20 karakter önerilir.
            </small>
          </section>

          <section className="profile-card">
            <h2 className="profile-card-title">🎯 Uzmanlık Alanları</h2>
            {specialties.length > 0 && (
              <div className="profile-chips">
                {specialties.map((s) => (
                  <span key={s} className="profile-chip">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSpecialty(s)}
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="profile-input-row">
              <input
                type="text"
                className="profile-input"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Yeni uzmanlık ekle..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpecialty(newSpecialty);
                  }
                }}
              />
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => addSpecialty(newSpecialty)}
              >
                Ekle
              </button>
            </div>
            <div className="profile-suggestions">
              <span className="profile-suggestions-label">Öneriler:</span>
              {SPECIALTY_SUGGESTIONS.filter((s) => !specialties.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="profile-suggestion"
                    onClick={() => addSpecialty(s)}
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </section>

          <section className="profile-card">
            <h2 className="profile-card-title">📜 Sertifikalar</h2>
            {certifications.length > 0 && (
              <div className="profile-chips">
                {certifications.map((c) => (
                  <span key={c} className="profile-chip">
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCertification(c)}
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="profile-input-row">
              <input
                type="text"
                className="profile-input"
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                placeholder="Sertifika adı (örn. ACE CPT)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCertification(newCert);
                  }
                }}
              />
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => addCertification(newCert)}
              >
                Ekle
              </button>
            </div>
          </section>

          <section className="profile-card">
            <h2 className="profile-card-title">🏋️ Sunduğum Hizmetler</h2>
            <div className="profile-chips-toggle">
              {SESSION_TYPE_OPTIONS.filter((opt) => {
                // Eğitmen sadece zaten verdiği veya yeni eklemek istediği türleri görür
                // Masöz ise PT'yi göstermez, PT ise masajı göstermez (ayrı disiplin)
                if (offersSessionTypes.length === 0) return true;
                // PT eğitmeni — sadece PT göster
                if (offersSessionTypes.includes('personal_training') && opt.value === 'massage')
                  return false;
                // Masöz — sadece masaj göster
                if (offersSessionTypes.includes('massage') && opt.value === 'personal_training')
                  return false;
                return true;
              }).map((opt) => {
                const active = offersSessionTypes.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`profile-chip-toggle ${active ? 'active' : ''}`}
                    onClick={() => toggleSessionType(opt.value)}
                  >
                    {active ? '✓ ' : ''}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <small className="profile-hint">
              Verdiğiniz hizmetleri seçin — üyeler keşif sayfasında bu hizmetlere göre filtreliyor.
            </small>
          </section>

          <section className="profile-card">
            <h2 className="profile-card-title">🏖️ Tatil / Müsait Değilim</h2>
            <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
              Belirli bir tarih aralığı için müsait olmadığınızı bildirin. Tatil bittiğinde otomatik aktif olursunuz.
            </p>
            <div className="services-grid-2">
              <label className="profile-field">
                <span>Dönüş Tarihi</span>
                <input
                  type="date"
                  className="profile-input"
                  value={awayUntil}
                  onChange={(e) => setAwayUntil(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label className="profile-field">
                <span>Tatil Mesajı (opsiyonel)</span>
                <input
                  type="text"
                  className="profile-input"
                  value={awayMessage}
                  onChange={(e) => setAwayMessage(e.target.value)}
                  placeholder="Örn: Tatildeyim, döndüğümde ulaşırım"
                  maxLength={200}
                />
              </label>
            </div>
            {awayUntil && (
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => {
                  setAwayUntil('');
                  setAwayMessage('');
                }}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              >
                ✕ Tatil Modunu Kaldır
              </button>
            )}
          </section>

          <section className="profile-card">
            <h2 className="profile-card-title">💰 Üyelere Gösterilecek Fiyat Notu</h2>
            <input
              type="text"
              className="profile-input"
              value={pricingNote}
              onChange={(e) => setPricingNote(e.target.value)}
              placeholder="Örn: Seans başı ücret — paket seçenekleri mevcuttur"
            />
            <small className="profile-hint">
              Bu metin keşif sayfasında profilinizin altında görünür. Detaylı paket ve ders ücretlerini "Hizmet & Paket" sayfasından yönetin.
            </small>
          </section>
        </div>
      </div>

      <div className="profile-save-bottom">
        <button
          className="btn-primary"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? '⏳ Kaydediliyor...' : '💾 Tüm Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
}
