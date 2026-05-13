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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
          <Link to="/" className="public-nav-brand">
            <strong>Wellness Club</strong>
          </Link>
        </nav>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-success">
              <span className="auth-success-icon">✓</span>
              <h2>Kayıt Başarılı!</h2>
              <p>
                Hesabınız oluşturuldu. Kulüp yöneticisi onayından sonra giriş yapabilirsiniz.
              </p>
              <Link to="/login" className="btn-primary" style={{ marginTop: '1.5rem' }}>
                Giriş Yap
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <strong>Wellness Club</strong>
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">
            Giriş Yap
          </Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card">
          <h1>Üye Ol</h1>
          <p className="auth-subtitle">
            Wellness Club'a üye ol, kulüpleri keşfet ve hizmetlerden faydalan.
          </p>

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-row">
              <label>
                <span>Ad *</span>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  required
                  minLength={1}
                />
              </label>
              <label>
                <span>Soyad *</span>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  required
                  minLength={1}
                />
              </label>
            </div>

            <label>
              <span>E-posta *</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </label>

            <label>
              <span>Kullanıcı Adı *</span>
              <input
                type="text"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                required
                minLength={3}
                pattern="[a-z0-9çğıöşü_.\-]+"
                title="Küçük harf, rakam, nokta, alt çizgi veya tire"
              />
            </label>

            <label>
              <span>Telefon</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+90 5XX XXX XX XX"
              />
            </label>

            <label>
              <span>Kulüp Kodu (opsiyonel)</span>
              <input
                type="text"
                value={form.tenantSubdomain}
                onChange={(e) => update('tenantSubdomain', e.target.value)}
                placeholder="Kulüp subdomain'i (ör: skyland)"
              />
              <small className="auth-hint">
                Belirli bir kulübe katılmak istiyorsanız kulüp kodunu girin.
              </small>
            </label>

            <label>
              <span>Şifre *</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
              />
              <small className="auth-hint">
                En az 8 karakter, büyük harf, küçük harf ve rakam içermeli.
              </small>
            </label>

            <label>
              <span>Şifre Tekrar *</span>
              <input
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => update('passwordConfirm', e.target.value)}
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={pending}>
              {pending ? 'Kaydediliyor...' : 'Üye Ol'}
            </button>
          </form>

          <p className="auth-footer-text">
            Zaten hesabın var mı?{' '}
            <Link to="/login">Giriş Yap</Link>
          </p>
          <p className="auth-footer-text">
            Partner/Kulüp sahibi misin?{' '}
            <Link to="/partner-register">Partner Başvurusu</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
