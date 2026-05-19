import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await apiJson('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bir hata oluştu, tekrar deneyin');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg-gradient" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#38bdf8" strokeWidth="3" />
              <path
                d="M20 28 Q32 16 44 28 Q32 40 20 28 Z"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cx="32" cy="40" r="3" fill="#38bdf8" />
            </svg>
          </div>
          <h1 className="auth-title">Şifremi Unuttum</h1>
          <p className="auth-subtitle">E-posta adresini gir, sıfırlama bağlantısı gönderelim.</p>
        </div>

        {sent ? (
          <div className="auth-success">
            <span className="auth-success-icon">✉️</span>
            <h3>E-posta gönderildi</h3>
            <p>
              Eğer <strong>{email}</strong> kayıtlı bir adresse, sıfırlama bağlantısı kısa süre
              içinde mail kutuna düşecek. Spam klasörünü de kontrol etmeyi unutma.
            </p>
            <Link to="/login" className="auth-submit auth-submit-secondary">
              Girişe dön
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">
              <span>E-posta</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="ornek@mail.com"
                required
                className="auth-input"
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={pending} className="auth-submit">
              {pending ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login" className="auth-link">
            ← Girişe dön
          </Link>
        </div>
      </div>
    </div>
  );
}
