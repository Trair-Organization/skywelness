import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function PublicNav({ active }: { active?: 'discover' }) {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="vitrin-nav">
      <Link to="/" className="vitrin-nav-brand">
        <img src="/wellnesslogoyazi.png?v=2" alt="WellnessClub" className="nav-logo-text" />
      </Link>
      <div className="vitrin-nav-links">
        <Link
          to="/discover"
          className={`vitrin-nav-link ${active === 'discover' ? 'active' : ''}`}
        >
          Keşfet
        </Link>
        {!token && (
          <>
            <Link to="/partner-register" className="vitrin-nav-link">
              Partner Ol
            </Link>
            <Link to="/register" className="vitrin-nav-link">
              Üye Ol
            </Link>
            <Link to="/login" className="vitrin-nav-login">
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
            >
              {user.role === 'member' ? '👤 Panelim' : '🏢 Panele Geç'}
            </Link>
            <button
              type="button"
              className="vitrin-nav-link"
              onClick={() => {
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
