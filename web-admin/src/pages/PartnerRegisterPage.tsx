import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

export function PartnerRegisterPage() {
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    clubCount: '',
    website: '',
    notes: '',
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
    setPending(true);
    try {
      await apiJson('/auth/register-partner', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          clubCount: form.clubCount ? Number(form.clubCount) : undefined,
          website: form.website.trim() || undefined,
          notes: form.notes.trim() || undefined,
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
          <Link to="/" className="public-nav-brand">
            <strong>Wellness Club</strong>
          </Link>
        </nav>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-success">
              <span className="auth-success-icon">✓</span>
              <h2>Başvuru Alındı!</h2>
              <p>
                Partner başvurunuz incelemeye alınmıştır. En kısa sürede sizinle iletişime
                geçeceğiz.
              </p>
              <Link to="/" className="btn-primary" style={{ marginTop: '1.5rem' }}>
                Ana Sayfaya Dön
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
          <Link to="/register">Üye Ol</Link>
          <Link to="/login" className="public-nav-login">
            Giriş Yap
          </Link>
        </div>
      </nav>

      <div className="auth-container">
        <div className="auth-card auth-card-wide">
          <h1>Partner Başvurusu</h1>
          <p className="auth-subtitle">
            Spor salonu, wellness merkezi veya fitness stüdyosu sahibi misiniz? Platformumuza
            katılın, dijital dönüşümünüzü başlatın.
          </p>

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-row">
              <label>
                <span>Şirket / Kulüp Adı *</span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label>
                <span>Yetkili Kişi *</span>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => update('contactName', e.target.value)}
                  required
                  minLength={2}
                />
              </label>
            </div>

            <div className="auth-row">
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
                <span>Telefon *</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  required
                  minLength={6}
                  placeholder="+90 5XX XXX XX XX"
                />
              </label>
            </div>

            <div className="auth-row">
              <label>
                <span>Şehir *</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                  required
                  minLength={2}
                />
              </label>
              <label>
                <span>Şube Sayısı</span>
                <input
                  type="number"
                  value={form.clubCount}
                  onChange={(e) => update('clubCount', e.target.value)}
                  min={1}
                  placeholder="1"
                />
              </label>
            </div>

            <label>
              <span>Web Sitesi</span>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://..."
              />
            </label>

            <label>
              <span>Ek Notlar</span>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={3}
                placeholder="Hizmetleriniz, hedefleriniz veya sorularınız..."
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn-primary auth-submit" disabled={pending}>
              {pending ? 'Gönderiliyor...' : 'Başvuru Gönder'}
            </button>
          </form>

          <div className="partner-benefits">
            <h3>Partner Avantajları</h3>
            <ul>
              <li>✓ Dijital üye yönetimi</li>
              <li>✓ Online rezervasyon sistemi</li>
              <li>✓ Eğitmen & ders planlaması</li>
              <li>✓ Mobil uygulama entegrasyonu</li>
              <li>✓ Kampanya & pazarlama araçları</li>
              <li>✓ Detaylı analitik & raporlama</li>
            </ul>
          </div>

          <p className="auth-footer-text">
            Zaten partner misiniz?{' '}
            <Link to="/login">Giriş Yap</Link>
          </p>
          <p className="auth-footer-text">
            Kullanıcı olarak mı katılmak istiyorsunuz?{' '}
            <Link to="/register">Üye Ol</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
