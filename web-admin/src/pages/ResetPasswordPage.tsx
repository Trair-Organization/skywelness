import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı');
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermeli');
      return;
    }

    setPending(true);
    try {
      await apiJson('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ token, newPassword: password }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Bağlantı geçersiz veya süresi dolmuş');
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-bg-gradient" />
        <div className="auth-card">
          <div className="auth-brand">
            <h1 className="auth-title">Geçersiz bağlantı</h1>
            <p className="auth-subtitle">Bağlantı geçersiz ya da süresi dolmuş.</p>
          </div>
          <Link to="/forgot-password" className="auth-submit">
            Yeni sıfırlama bağlantısı al
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg-gradient" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <img src="/wellnesslogodaire.png?v=2" alt="WellnessClub" />
          </div>
          <h1 className="auth-title">Yeni Şifre Belirle</h1>
          <p className="auth-subtitle">En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam.</p>
        </div>

        {success ? (
          <div className="auth-success">
            <span className="auth-success-icon">✅</span>
            <h3>Şifren güncellendi</h3>
            <p>Birazdan giriş ekranına yönlendirileceksin.</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            <label className="auth-label">
              <span>Yeni Şifre</span>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </label>
            <label className="auth-label">
              <span>Yeni Şifre (Tekrar)</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                className="auth-input"
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" disabled={pending} className="auth-submit">
              {pending ? 'Güncelleniyor...' : 'Şifreyi güncelle'}
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
