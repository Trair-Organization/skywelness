import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type ProtectedRouteProps = {
  allowedRoles?: string[];
};

export function ProtectedRoute({
  allowedRoles = ['administrator', 'platform_admin'],
}: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { token, user, ready, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="shell">
        <p className="muted">{t('protected.loading')}</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="shell narrow">
        <h1>{t('protected.deniedTitle')}</h1>
        <p className="muted">{t('protected.deniedBody')}</p>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            logout();
            navigate('/login', { replace: true });
          }}
        >
          {t('protected.signOut')}
        </button>
      </div>
    );
  }

  return <Outlet />;
}
