import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

const SPECIALTY_OPTIONS = [
  'Fitness', 'Pilates', 'Yoga', 'CrossFit', 'Boks', 'Kickboks',
  'Fonksiyonel Antrenman', 'Kilo Verme', 'Kas Geliştirme', 'Rehabilitasyon',
  'Beslenme Danışmanlığı', 'Masaj', 'Yüzme', 'Koşu', 'Bisiklet', 'TRX',
];

const SESSION_TYPE_OPTIONS = [
  { value: 'personal_training', label: 'Kişisel Antrenman' },
  { value: 'massage', label: 'Masaj' },
];

export function TrainerRegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    city: '',
    bio: '',
    experienceYears: '',
    pricingNote: '',
    preferredClubSubdomain: '',
  });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [offersSessionTypes, setOffersSessionTypes] = useState<string[]>(['personal_training']);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleSessionType(t: string) {
    setOffersSessionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function addCert() {
    const val = newCert.trim();
    if (val && !certifications.includes(val)) {
      setCertifications((prev) => [...prev, val]);
      setNewCert('');
    }
  }

  function removeCert(c: string) {
    setCertifications((prev) => prev.filter((x) => x !== c));
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('https://www.wellnessclub.tech/api/v1/auth/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        const fullUrl = data.url.startsWith('http')
          ? data.url
          : `https://www.wellnessclub.tech${data.url}`;
        setPhotoUrl(fullUrl);
      }
    } catch {
      setError('Fotoğraf yüklenemedi.');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (specialties.length === 0) {
      setError('En az bir uzmanlık alanı seçmelisiniz.');
      return;
    }
    if (offersSessionTypes.length === 0) {
      setError('En az bir hizmet türü seçmelisiniz.');
      return;
    }
    if (form.bio.length < 20) {
      setError('Biyografi en az 20 karakter olmalıdır.');
      return;
    }

    setPending(true);
    try {
      await apiJson('/auth/register-trainer', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          username: form.username.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          city: form.city.trim(),
          bio: form.bio.trim(),
          specialties,
          certifications: certifications.length > 0 ? certifications : undefined,
          experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined,
          offersSessionTypes,
          photoUrl: photoUrl || undefined,
          pricingNote: form.pricingNote.trim() || undefined,
          preferredClubSubdomain: form.preferredClubSubdomain.trim() || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Başvuru gönderilemedi.');
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <div className="public-shell">
        <nav className="public-nav">
          <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /></Link>
        </nav>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-success">
              <span className="auth-success-icon">✓</span>
              <h2>Başvuru Alındı!</h2>
              <p>Eğitmen başvurunuz incelemeye alınmıştır. Onay sonrası giriş yapabilirsiniz.</p>
              <Link to="/login" className="btn-primary" style={{ marginTop: '1.5rem' }}>Giriş Yap</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /></Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/register">Üye Ol</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card auth-card-wide">
          <h1>Eğitmen Başvurusu</h1>
          <p className="auth-subtitle">
            Sertifikalı eğitmen misiniz? Platformumuza katılın, öğrencilerinize ulaşın.
          </p>

          <form className="auth-form" onSubmit={onSubmit}>
            {/* Fotoğraf */}
            <div className="photo-upload-section">
              <label className="photo-upload-label">Profil Fotoğrafı</label>
              <div className="photo-upload-area">
                {photoUrl ? (
                  <div className="photo-preview">
                    <img src={photoUrl} alt="Profil" />
                    <button type="button" className="photo-remove" onClick={() => setPhotoUrl(null)}>×</button>
                  </div>
                ) : (
                  <label className="photo-dropzone">
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoUpload(f);
                      }}
                    />
                    {uploading ? (
                      <span className="photo-uploading">Yükleniyor...</span>
                    ) : (
                      <>
                        <span className="photo-icon">📷</span>
                        <span className="photo-text">Fotoğraf Yükle</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="auth-row">
              <label><span>Ad *</span><input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required /></label>
              <label><span>Soyad *</span><input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required /></label>
            </div>

            <div className="auth-row">
              <label><span>E-posta *</span><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>
              <label><span>Telefon *</span><input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} required placeholder="+90 5XX XXX XX XX" /></label>
            </div>

            <div className="auth-row">
              <label><span>Kullanıcı Adı *</span><input type="text" value={form.username} onChange={(e) => update('username', e.target.value)} required minLength={3} pattern="[a-z0-9çğıöşü_.\-]+" /></label>
              <label><span>Şehir *</span><input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} required /></label>
            </div>

            <label>
              <span>Biyografi * (min 20 karakter)</span>
              <textarea value={form.bio} onChange={(e) => update('bio', e.target.value)} required minLength={20} rows={4} placeholder="Kendinizi tanıtın, deneyimlerinizi ve yaklaşımınızı anlatın..." />
            </label>

            {/* Uzmanlık Alanları */}
            <div className="chips-section">
              <span className="chips-label">Uzmanlık Alanları *</span>
              <div className="chips-grid">
                {SPECIALTY_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${specialties.includes(s) ? 'chip-active' : ''}`}
                    onClick={() => toggleSpecialty(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Hizmet Türleri */}
            <div className="chips-section">
              <span className="chips-label">Sunduğunuz Hizmetler *</span>
              <div className="chips-grid">
                {SESSION_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`chip ${offersSessionTypes.includes(t.value) ? 'chip-active' : ''}`}
                    onClick={() => toggleSessionType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sertifikalar */}
            <div className="chips-section">
              <span className="chips-label">Sertifikalar</span>
              <div className="cert-input-row">
                <input
                  type="text"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  placeholder="Sertifika adı yazıp ekleyin"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }}
                />
                <button type="button" className="btn-outline cert-add-btn" onClick={addCert}>Ekle</button>
              </div>
              {certifications.length > 0 && (
                <div className="chips-grid" style={{ marginTop: '0.5rem' }}>
                  {certifications.map((c) => (
                    <span key={c} className="chip chip-active chip-removable" onClick={() => removeCert(c)}>
                      {c} ×
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="auth-row">
              <label><span>Deneyim (yıl)</span><input type="number" value={form.experienceYears} onChange={(e) => update('experienceYears', e.target.value)} min={0} placeholder="5" /></label>
              <label><span>Ücret Bilgisi</span><input type="text" value={form.pricingNote} onChange={(e) => update('pricingNote', e.target.value)} placeholder="ör: Seans başı 500₺" /></label>
            </div>

            <label>
              <span>Tercih Ettiğiniz Kulüp (opsiyonel)</span>
              <input type="text" value={form.preferredClubSubdomain} onChange={(e) => update('preferredClubSubdomain', e.target.value)} placeholder="Kulüp kodu (ör: skyland)" />
            </label>

            <div className="auth-row">
              <label><span>Şifre *</span><input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={8} /></label>
              <label><span>Şifre Tekrar *</span><input type="password" value={form.passwordConfirm} onChange={(e) => update('passwordConfirm', e.target.value)} required /></label>
            </div>
            <small className="auth-hint">En az 8 karakter, büyük harf, küçük harf ve rakam içermeli.</small>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={pending}>
              {pending ? 'Gönderiliyor...' : 'Başvuru Gönder'}
            </button>
          </form>

          <p className="auth-footer-text">Kullanıcı olarak mı katılmak istiyorsunuz? <Link to="/register">Üye Ol</Link></p>
          <p className="auth-footer-text">Kulüp/Salon sahibi misiniz? <Link to="/partner-register">Partner Başvurusu</Link></p>
        </div>
      </div>
    </div>
  );
}
