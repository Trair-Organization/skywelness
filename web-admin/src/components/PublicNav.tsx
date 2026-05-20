import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function PublicNav({ active }: { active?: 'discover' }) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function close() {
    setMenuOpen(false);
  }

  return (
    <nav className="vitrin-nav">
      <Link to="/" className="vitrin-nav-brand" onClick={close}>
        <img src="/wellnesslogoyazi.png?v=2" alt="WellnessClub" className="nav-logo-text" />
      </Link>

      {/* Hamburger toggle (mobil) */}
      <button
        type="button"
        className={`vitrin-nav-toggle ${menuOpen ? 'open' : ''}`}
        aria-label="Menü"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div className={`vitrin-nav-links ${menuOpen ? 'open' : ''}`}>
        <Link
          to="/discover"
          className={`vitrin-nav-link ${active === 'discover' ? 'active' : ''}`}
          onClick={close}
        >
          Keşfet
        </Link>
        {!token && (
          <>
            <Link to="/partner-register" className="vitrin-nav-link" onClick={close}>
              Partner Ol
            </Link>
            <Link to="/register" className="vitrin-nav-link" onClick={close}>
              Üye Ol
            </Link>
            <Link to="/login" className="vitrin-nav-login" onClick={close}>
              Giriş Yap
            </Link>
          </>
        )}
        {token && user && (
          <>
            <Link
              to={
                user.role === 'member'
                  ? '/dashboard'
                  : user.role === 'trainer'
                    ? '/trainer/dashboard'
                    : user.role === 'platform_admin'
                      ? '/super-admin/dashboard'
                      : '/club/dashboard'
              }
              className="vitrin-nav-login"
              onClick={close}
            >
              {user.role === 'member' ? '👤 Panelim' : '🏢 Panele Geç'}
            </Link>
            <button
              type="button"
              className="vitrin-nav-link"
              onClick={() => {
                close();
                logout();
                navigate('/');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              Çıkış
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
