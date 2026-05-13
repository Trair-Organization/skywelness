import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { readStoredTenantSubdomain } from '../auth/storage';

type NavItem = { path: string; icon: string; label: string };

const WELLNESS_NAV: NavItem[] = [
  { path: '/club/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/club/profile', icon: '🏢', label: 'Profil Düzenle' },
  { path: '/members', icon: '👥', label: 'Üyeler' },
  { path: '/pt', icon: '🏋️', label: 'PT Yönetimi' },
  { path: '/spa', icon: '💆', label: 'Spa Yönetimi' },
  { path: '/schedule', icon: '🗓️', label: 'Ajanda' },
  { path: '/packages', icon: '📦', label: 'Paketler' },
  { path: '/events', icon: '📅', label: 'Etkinlikler' },
  { path: '/connections', icon: '🔗', label: 'Bağlantılar' },
  { path: '/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/campaigns', icon: '🔥', label: 'Kampanyalar' },
];

const GENERIC_NAV: NavItem[] = [
  { path: '/club/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/club/profile', icon: '🏢', label: 'Profil Düzenle' },
  { path: '/resource-management', icon: '🏟️', label: 'Kort & Slotlar' },
  { path: '/members', icon: '👥', label: 'Üyeler' },
  { path: '/connections', icon: '🔗', label: 'Bağlantılar' },
  { path: '/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/events', icon: '📅', label: 'Etkinlikler' },
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
  { path: '/trainer/profile', icon: '🏋️', label: 'Profilim' },
  { path: '/trainer/students', icon: '👥', label: 'Öğrencilerim' },
  { path: '/trainer/messages', icon: '💬', label: 'Mesajlar' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!user) return <>{children}</>;

  const tenantSubdomain = readStoredTenantSubdomain();
  const isWellness = tenantSubdomain === 'skyland-wellness';

  const nav =
    user.role === 'platform_admin'
      ? PLATFORM_NAV
      : user.role === 'trainer'
        ? TRAINER_NAV
        : isWellness
          ? WELLNESS_NAV
          : GENERIC_NAV;

  const roleLabel =
    user.role === 'platform_admin'
      ? 'Platform Admin'
      : user.role === 'trainer'
        ? 'Eğitmen'
        : 'Kulüp Yöneticisi';

  return (
    <div className={`admin-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Hamburger Button */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
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
              onClick={() => {
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
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
      <main className={`admin-main ${sidebarOpen ? '' : 'main-expanded'}`}>{children}</main>
    </div>
  );
}
