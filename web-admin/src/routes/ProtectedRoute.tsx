import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AdminLayout } from '../components/AdminLayout';

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

  // Bağımsız eğitmen / eğitmen ise account status pending/rejected → status sayfasına yönlendir
  const isTrainer = user.role === 'trainer' || user.role === 'independent_trainer';
  const blockedStatuses = ['pending_approval', 'rejected'];
  if (
    isTrainer &&
    user.accountStatus &&
    blockedStatuses.includes(user.accountStatus) &&
    location.pathname !== '/trainer/application-status'
  ) {
    return <Navigate to="/trainer/application-status" replace />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
