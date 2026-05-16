import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';

type PartnerType = null | 'corporate' | 'trainer';

const SPECIALTY_OPTIONS = [
  'Fitness', 'Pilates', 'Yoga', 'CrossFit', 'Boks', 'Kickboks',
  'Fonksiyonel Antrenman', 'Kilo Verme', 'Kas Geliştirme', 'Rehabilitasyon',
  'Beslenme Danışmanlığı', 'Masaj', 'Yüzme', 'Koşu', 'TRX', 'Padel',
];

const SESSION_TYPE_OPTIONS = [
  { value: 'personal_training', label: 'Kişisel Antrenman' },
  { value: 'massage', label: 'Masaj' },
];

export function PartnerRegisterPage() {
  const [partnerType, setPartnerType] = useState<PartnerType>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Corporate form
  const [corp, setCorp] = useState({
    companyName: '', contactName: '', email: '', phone: '',
    city: '', district: '', clubCount: '', website: '', notes: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Trainer form
  const [trainer, setTrainer] = useState({
    firstName: '', lastName: '', email: '', username: '', phone: '',
    password: '', passwordConfirm: '', city: '', district: '', bio: '',
    experienceYears: '', pricingNote: '', preferredClubSubdomain: '',
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [offersSessionTypes, setOffersSessionTypes] = useState<string[]>(['personal_training']);

  function updateCorp(field: string, value: string) {
    setCorp((prev) => ({ ...prev, [field]: value }));
  }
  function updateTrainer(field: string, value: string) {
    setTrainer((prev) => ({ ...prev, [field]: value }));
  }
  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function toggleSessionType(t: string) {
    setOffersSessionTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function addCert() {
    const val = newCert.trim();
    if (val && !certifications.includes(val)) { setCertifications((prev) => [...prev, val]); setNewCert(''); }
  }
  function removeCert(c: string) { setCertifications((prev) => prev.filter((x) => x !== c)); }

  async function handleUpload(file: File, type: 'logo' | 'photo') {
    const setUploading = type === 'logo' ? setLogoUploading : setPhotoUploading;
    const setUrl = type === 'logo' ? setLogoUrl : setPhotoUrl;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('https://www.wellnessclub.tech/api/v1/auth/upload-image', { method: 'POST', body: formData });
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        setUrl(data.url.startsWith('http') ? data.url : `https://www.wellnessclub.tech${data.url}`);
      }
    } catch { setError('Dosya yüklenemedi.'); }
    finally { setUploading(false); }
  }

  async function submitCorporate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await apiJson('/auth/register-partner', {
        method: 'POST', auth: false,
        body: JSON.stringify({
          companyName: corp.companyName.trim(),
          contactName: corp.contactName.trim(),
          email: corp.email.trim().toLowerCase(),
          phone: corp.phone.trim(),
          city: corp.city.trim(),
          district: corp.district?.trim() || undefined,
          clubCount: corp.clubCount ? Number(corp.clubCount) : undefined,
          website: corp.website.trim() || undefined,
          logoUrl: logoUrl || undefined,
          notes: corp.notes.trim() || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Başvuru gönderilemedi.'); }
    finally { setPending(false); }
  }

  async function submitTrainer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (trainer.password !== trainer.passwordConfirm) { setError('Şifreler eşleşmiyor.'); return; }
    if (specialties.length === 0) { setError('En az bir uzmanlık alanı seçin.'); return; }
    if (offersSessionTypes.length === 0) { setError('En az bir hizmet türü seçin.'); return; }
    if (trainer.bio.length < 20) { setError('Biyografi en az 20 karakter olmalı.'); return; }
    setPending(true);
    try {
      await apiJson('/auth/register-trainer', {
        method: 'POST', auth: false,
        body: JSON.stringify({
          firstName: trainer.firstName.trim(),
          lastName: trainer.lastName.trim(),
          email: trainer.email.trim().toLowerCase(),
          username: trainer.username.trim().toLowerCase(),
          phone: trainer.phone.trim(),
          password: trainer.password,
          city: trainer.city.trim(),
          district: trainer.district?.trim() || undefined,
          bio: trainer.bio.trim(),
          specialties,
          certifications: certifications.length > 0 ? certifications : undefined,
          experienceYears: trainer.experienceYears ? Number(trainer.experienceYears) : undefined,
          offersSessionTypes,
          photoUrl: photoUrl || undefined,
          pricingNote: trainer.pricingNote.trim() || undefined,
          preferredClubSubdomain: trainer.preferredClubSubdomain.trim() || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Başvuru gönderilemedi.'); }
    finally { setPending(false); }
  }

  // Success
  if (success) {
    return (
      <div className="public-shell">
        <nav className="public-nav">
          <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /><img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" /></Link>
        </nav>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-success">
              <span className="auth-success-icon">✓</span>
              <h2>Başvuru Alındı!</h2>
              <p>{partnerType === 'corporate' ? 'Kurumsal partner başvurunuz incelemeye alınmıştır. En kısa sürede sizinle iletişime geçeceğiz.' : 'Eğitmen başvurunuz incelemeye alınmıştır. Onay sonrası giriş yapabilirsiniz.'}</p>
              <Link to="/login" className="btn-primary" style={{ marginTop: '1.5rem' }}>Giriş Yap</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Type Selection
  if (!partnerType) {
    return (
      <div className="public-shell">
        <nav className="public-nav">
          <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /><img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" /></Link>
          <div className="public-nav-links">
            <Link to="/discover">Keşfet</Link>
            <Link to="/register">Üye Ol</Link>
            <Link to="/login" className="public-nav-login">Giriş Yap</Link>
          </div>
        </nav>
        <div className="auth-container">
          <div className="auth-card auth-card-wide">
            <h1>Partner Ol</h1>
            <p className="auth-subtitle">Platformumuza katılın, dijital dönüşümünüzü başlatın. Hangi tür partner olmak istiyorsunuz?</p>
            <div className="partner-type-grid">
              <button className="partner-type-card" onClick={() => setPartnerType('corporate')}>
                <span className="partner-type-icon">🏢</span>
                <h3>Kurumsal Partner</h3>
                <p>Spor salonu, wellness merkezi, stüdyo veya fitness kulübü</p>
                <ul>
                  <li>Admin paneli ile tam yönetim</li>
                  <li>Slider, hizmetler, fiyatlar</li>
                  <li>Personel & eğitmen yönetimi</li>
                  <li>Rezervasyon & üye takibi</li>
                </ul>
              </button>
              <button className="partner-type-card" onClick={() => setPartnerType('trainer')}>
                <span className="partner-type-icon">🏋️</span>
                <h3>Bireysel Eğitmen</h3>
                <p>Freelance personal trainer, masör veya wellness uzmanı</p>
                <ul>
                  <li>Kişisel profil sayfası</li>
                  <li>Ajanda & randevu yönetimi</li>
                  <li>Öğrenci takibi</li>
                  <li>Mesajlaşma & iletişim</li>
                </ul>
              </button>
            </div>
            <p className="auth-footer-text">Kullanıcı olarak mı katılmak istiyorsunuz? <Link to="/register">Üye Ol</Link></p>
          </div>
        </div>
      </div>
    );
  }

  // Corporate Form
  if (partnerType === 'corporate') {
    return (
      <div className="public-shell">
        <nav className="public-nav">
          <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /><img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" /></Link>
          <div className="public-nav-links">
            <Link to="/discover">Keşfet</Link>
            <Link to="/login" className="public-nav-login">Giriş Yap</Link>
          </div>
        </nav>
        <div className="auth-container">
          <div className="auth-card auth-card-wide">
            <button className="back-btn" onClick={() => { setPartnerType(null); setError(null); }}>← Geri</button>
            <h1>🏢 Kurumsal Partner Başvurusu</h1>
            <p className="auth-subtitle">Spor salonu, wellness merkezi veya fitness stüdyosu bilgilerinizi girin. Onay sonrası admin paneliniz aktif olacak.</p>

            <form className="auth-form" onSubmit={submitCorporate}>
              {/* Logo */}
              <div className="photo-upload-section">
                <label className="photo-upload-label">Şirket Logosu</label>
                <div className="photo-upload-area">
                  {logoUrl ? (
                    <div className="logo-preview">
                      <img src={logoUrl} alt="Logo" />
                      <button type="button" className="photo-remove" onClick={() => setLogoUrl(null)}>×</button>
                    </div>
                  ) : (
                    <label className="logo-dropzone">
                      <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'logo'); }} />
                      {logoUploading ? <span className="photo-uploading">Yükleniyor...</span> : <><span className="photo-icon">🏢</span><span className="photo-text">Logo Yükle</span></>}
                    </label>
                  )}
                </div>
              </div>

              <div className="auth-row">
                <label><span>Şirket / Kulüp Adı *</span><input type="text" value={corp.companyName} onChange={(e) => updateCorp('companyName', e.target.value)} required minLength={2} /></label>
                <label><span>Yetkili Kişi *</span><input type="text" value={corp.contactName} onChange={(e) => updateCorp('contactName', e.target.value)} required minLength={2} /></label>
              </div>
              <div className="auth-row">
                <label><span>E-posta *</span><input type="email" value={corp.email} onChange={(e) => updateCorp('email', e.target.value)} required /></label>
                <label><span>Telefon *</span><input type="tel" value={corp.phone} onChange={(e) => updateCorp('phone', e.target.value)} required minLength={6} placeholder="+90 5XX XXX XX XX" /></label>
              </div>
              <div className="auth-row">
                <label><span>İl *</span><select value={corp.city} onChange={(e) => { updateCorp('city', e.target.value); updateCorp('district', ''); }} required style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}><option value="">Seçin...</option>{CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
                <label><span>İlçe</span><select value={corp.district || ''} onChange={(e) => updateCorp('district', e.target.value)} disabled={!corp.city} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}><option value="">Seçin...</option>{corp.city && getDistricts(corp.city).map(d => <option key={d} value={d}>{d}</option>)}</select></label>
              </div>
              <div className="auth-row">
                <label><span>Şube Sayısı</span><input type="number" value={corp.clubCount} onChange={(e) => updateCorp('clubCount', e.target.value)} min={1} placeholder="1" /></label>
              </div>
              <label><span>Web Sitesi</span><input type="url" value={corp.website} onChange={(e) => updateCorp('website', e.target.value)} placeholder="https://..." /></label>
              <label><span>Ek Notlar</span><textarea value={corp.notes} onChange={(e) => updateCorp('notes', e.target.value)} rows={3} placeholder="Hizmetleriniz, hedefleriniz veya sorularınız..." /></label>

              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="btn-primary auth-submit" disabled={pending}>{pending ? 'Gönderiliyor...' : 'Başvuru Gönder'}</button>
            </form>

            <div className="partner-benefits">
              <h3>Onay Sonrası Neler Yapabilirsiniz?</h3>
              <ul>
                <li>✓ Slider & galeri görselleri yönetimi</li>
                <li>✓ Hakkında & açıklama düzenleme</li>
                <li>✓ Hizmet & ürün kataloğu</li>
                <li>✓ Fiyat & paket yönetimi</li>
                <li>✓ Personel & eğitmen ekleme</li>
                <li>✓ Rezervasyon & üye takibi</li>
                <li>✓ Kampanya & bildirim gönderme</li>
                <li>✓ Detaylı analitik & raporlama</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trainer Form
  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand"><img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" /><img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" /></Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>
      <div className="auth-container">
        <div className="auth-card auth-card-wide">
          <button className="back-btn" onClick={() => { setPartnerType(null); setError(null); }}>← Geri</button>
          <h1>🏋️ Bireysel Eğitmen Başvurusu</h1>
          <p className="auth-subtitle">Sertifikalı eğitmen misiniz? Platformumuza katılın, öğrencilerinize ulaşın.</p>

          <form className="auth-form" onSubmit={submitTrainer}>
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
                    <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, 'photo'); }} />
                    {photoUploading ? <span className="photo-uploading">Yükleniyor...</span> : <><span className="photo-icon">📷</span><span className="photo-text">Fotoğraf Yükle</span></>}
                  </label>
                )}
              </div>
            </div>

            <div className="auth-row">
              <label><span>Ad *</span><input type="text" value={trainer.firstName} onChange={(e) => updateTrainer('firstName', e.target.value)} required /></label>
              <label><span>Soyad *</span><input type="text" value={trainer.lastName} onChange={(e) => updateTrainer('lastName', e.target.value)} required /></label>
            </div>
            <div className="auth-row">
              <label><span>E-posta *</span><input type="email" value={trainer.email} onChange={(e) => updateTrainer('email', e.target.value)} required /></label>
              <label><span>Telefon *</span><input type="tel" value={trainer.phone} onChange={(e) => updateTrainer('phone', e.target.value)} required placeholder="+90 5XX XXX XX XX" /></label>
            </div>
            <div className="auth-row">
              <label><span>Kullanıcı Adı *</span><input type="text" value={trainer.username} onChange={(e) => updateTrainer('username', e.target.value)} required minLength={3} pattern="[a-z0-9çğıöşü_.\-]+" /></label>
            </div>
            <div className="auth-row">
              <label><span>İl *</span><select value={trainer.city} onChange={(e) => { updateTrainer('city', e.target.value); updateTrainer('district', ''); }} required style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}><option value="">Seçin...</option>{CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
              <label><span>İlçe</span><select value={trainer.district || ''} onChange={(e) => updateTrainer('district', e.target.value)} disabled={!trainer.city} style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}><option value="">Seçin...</option>{trainer.city && getDistricts(trainer.city).map(d => <option key={d} value={d}>{d}</option>)}</select></label>
            </div>

            <label><span>Biyografi * (min 20 karakter)</span><textarea value={trainer.bio} onChange={(e) => updateTrainer('bio', e.target.value)} required minLength={20} rows={4} placeholder="Kendinizi tanıtın, deneyimlerinizi ve yaklaşımınızı anlatın..." /></label>

            {/* Uzmanlık */}
            <div className="chips-section">
              <span className="chips-label">Uzmanlık Alanları *</span>
              <div className="chips-grid">
                {SPECIALTY_OPTIONS.map((s) => (
                  <button key={s} type="button" className={`chip ${specialties.includes(s) ? 'chip-active' : ''}`} onClick={() => toggleSpecialty(s)}>{s}</button>
                ))}
              </div>
            </div>

            {/* Hizmet Türleri */}
            <div className="chips-section">
              <span className="chips-label">Sunduğunuz Hizmetler *</span>
              <div className="chips-grid">
                {SESSION_TYPE_OPTIONS.map((t) => (
                  <button key={t.value} type="button" className={`chip ${offersSessionTypes.includes(t.value) ? 'chip-active' : ''}`} onClick={() => toggleSessionType(t.value)}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Sertifikalar */}
            <div className="chips-section">
              <span className="chips-label">Sertifikalar</span>
              <div className="cert-input-row">
                <input type="text" value={newCert} onChange={(e) => setNewCert(e.target.value)} placeholder="Sertifika adı yazıp ekleyin" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }} />
                <button type="button" className="btn-outline cert-add-btn" onClick={addCert}>Ekle</button>
              </div>
              {certifications.length > 0 && (
                <div className="chips-grid" style={{ marginTop: '0.5rem' }}>
                  {certifications.map((c) => (<span key={c} className="chip chip-active chip-removable" onClick={() => removeCert(c)}>{c} ×</span>))}
                </div>
              )}
            </div>

            <div className="auth-row">
              <label><span>Deneyim (yıl)</span><input type="number" value={trainer.experienceYears} onChange={(e) => updateTrainer('experienceYears', e.target.value)} min={0} placeholder="5" /></label>
              <label><span>Ücret Bilgisi</span><input type="text" value={trainer.pricingNote} onChange={(e) => updateTrainer('pricingNote', e.target.value)} placeholder="ör: Seans başı 500₺" /></label>
            </div>

            <label><span>Tercih Ettiğiniz Kulüp (opsiyonel)</span><input type="text" value={trainer.preferredClubSubdomain} onChange={(e) => updateTrainer('preferredClubSubdomain', e.target.value)} placeholder="Kulüp kodu (ör: skyland)" /><small className="auth-hint">Bir kulübe bağlı çalışmak istiyorsanız kulüp kodunu girin.</small></label>

            <div className="auth-row">
              <label><span>Şifre *</span><input type="password" value={trainer.password} onChange={(e) => updateTrainer('password', e.target.value)} required minLength={8} /></label>
              <label><span>Şifre Tekrar *</span><input type="password" value={trainer.passwordConfirm} onChange={(e) => updateTrainer('passwordConfirm', e.target.value)} required /></label>
            </div>
            <small className="auth-hint">En az 8 karakter, büyük harf, küçük harf ve rakam içermeli.</small>

            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn-primary auth-submit" disabled={pending}>{pending ? 'Gönderiliyor...' : 'Başvuru Gönder'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
