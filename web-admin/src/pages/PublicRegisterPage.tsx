import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

export function PublicRegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    tenantSubdomain: '',
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        const fullUrl = data.url.startsWith('http') ? data.url : `https://www.wellnessclub.tech${data.url}`;
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
    if (form.password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }

    setPending(true);
    try {
      await apiJson('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          username: form.username.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          tenantSubdomain: form.tenantSubdomain.trim() || undefined,
          photoUrl: photoUrl || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kayıt başarısız oldu.');
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
              <h2>Kayıt Başarılı!</h2>
              <p>Hesabınız oluşturuldu. Kulüp yöneticisi onayından sonra giriş yapabilirsiniz.</p>
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
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <h1>Üye Ol</h1>
          <p className="auth-subtitle">Wellness Club'a üye ol, kulüpleri keşfet ve hizmetlerden faydalan.</p>

          <form className="auth-form" onSubmit={onSubmit}>
            {/* Profil Fotoğrafı */}
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
                    <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                    {uploading ? <span className="photo-uploading">Yükleniyor...</span> : <><span className="photo-icon">📷</span><span className="photo-text">Fotoğraf Yükle</span></>}
                  </label>
                )}
              </div>
            </div>

            <div className="auth-row">
              <label><span>Ad *</span><input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required minLength={1} /></label>
              <label><span>Soyad *</span><input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required minLength={1} /></label>
            </div>

            <label><span>E-posta *</span><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></label>

            <label>
              <span>Kullanıcı Adı *</span>
              <input type="text" value={form.username} onChange={(e) => update('username', e.target.value)} required minLength={3} pattern="[a-z0-9çğıöşü_.\-]+" title="Küçük harf, rakam, nokta, alt çizgi veya tire" />
            </label>

            <label><span>Telefon</span><input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+90 5XX XXX XX XX" /></label>

            <label>
              <span>Kulüp Kodu (opsiyonel)</span>
              <input type="text" value={form.tenantSubdomain} onChange={(e) => update('tenantSubdomain', e.target.value)} placeholder="Kulüp subdomain'i (ör: skyland)" />
              <small className="auth-hint">Belirli bir kulübe katılmak istiyorsanız kulüp kodunu girin.</small>
            </label>

            <div className="auth-row">
              <label><span>Şifre *</span><input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={8} /></label>
              <label><span>Şifre Tekrar *</span><input type="password" value={form.passwordConfirm} onChange={(e) => update('passwordConfirm', e.target.value)} required /></label>
            </div>
            <small className="auth-hint">En az 8 karakter, büyük harf, küçük harf ve rakam içermeli.</small>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={pending}>
              {pending ? 'Kaydediliyor...' : 'Üye Ol'}
            </button>
          </form>

          <p className="auth-footer-text">Zaten hesabın var mı? <Link to="/login">Giriş Yap</Link></p>
          <p className="auth-footer-text">Eğitmen misiniz? <Link to="/trainer-register">Eğitmen Başvurusu</Link></p>
          <p className="auth-footer-text">Kulüp sahibi misiniz? <Link to="/partner-register">Partner Başvurusu</Link></p>
        </div>
      </div>
    </div>
  );
}
