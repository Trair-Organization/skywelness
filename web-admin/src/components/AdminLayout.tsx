import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type NavItem = { path: string; icon: string; label: string };

const CLUB_NAV: NavItem[] = [
  { path: '/club/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/members', icon: '👥', label: 'Üyeler' },
  { path: '/trainers', icon: '🏋️', label: 'Eğitmenler' },
  { path: '/schedule', icon: '🗓️', label: 'Ajanda' },
  { path: '/packages', icon: '📦', label: 'Paketler' },
  { path: '/events', icon: '📅', label: 'Etkinlikler' },
  { path: '/spa', icon: '🧖', label: 'Spa & Wellness' },
  { path: '/leads', icon: '📋', label: 'Gelen Talepler' },
  { path: '/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/campaigns', icon: '🔥', label: 'Kampanyalar' },
  { path: '/club/reservation-requests', icon: '📝', label: 'PT Rezervasyonları' },
  { path: '/club/cafe-orders', icon: '☕', label: 'Cafe Siparişleri' },
];

const PLATFORM_NAV: NavItem[] = [
  { path: '/super-admin/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/super-admin/tenants', icon: '🏢', label: 'Kulüpler' },
  { path: '/super-admin/users', icon: '👥', label: 'Kullanıcılar' },
  { path: '/super-admin/trainers', icon: '🏋️', label: 'Eğitmenler' },
  { path: '/super-admin/discovery', icon: '🌐', label: 'Keşif Yönetimi' },
  { path: '/super-admin/leads', icon: '📋', label: 'Talepler' },
  { path: '/super-admin/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/super-admin/audit', icon: '📜', label: 'Audit Log' },
  { path: '/platform/trainers/pending', icon: '⏳', label: 'Eğitmen Başvuruları' },
];

const TRAINER_NAV: NavItem[] = [
  { path: '/trainer/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/trainer/students', icon: '👥', label: 'Öğrencilerim' },
  { path: '/trainer/messages', icon: '💬', label: 'Mesajlar' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const nav =
    user.role === 'platform_admin'
      ? PLATFORM_NAV
      : user.role === 'trainer'
        ? TRAINER_NAV
        : CLUB_NAV;

  const roleLabel =
    user.role === 'platform_admin'
      ? 'Platform Admin'
      : user.role === 'trainer'
        ? 'Eğitmen'
        : 'Kulüp Yöneticisi';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">⚡</span>
          <span className="sidebar-brand-text">Wellness Club</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">
                {user.firstName} {user.lastName}
              </span>
              <span className="sidebar-user-role">{roleLabel}</span>
            </div>
          </div>
          <button
            className="sidebar-logout"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Çıkış
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
