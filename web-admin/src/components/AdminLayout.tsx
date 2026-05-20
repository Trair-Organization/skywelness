import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { readStoredTenantSubdomain } from '../auth/storage';
import { apiJson } from '../lib/api';

type NavItem = { path: string; icon: string; label: string };

const WELLNESS_NAV: NavItem[] = [
  { path: '/club/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/members', icon: '👥', label: 'Üyeler' },
  { path: '/spa', icon: '💆', label: 'Spa Yönetimi' },
  { path: '/pt', icon: '🏋️', label: 'PT Yönetimi' },
  { path: '/events', icon: '🎉', label: 'Etkinlikler' },
  { path: '/campaigns', icon: '🔥', label: 'Kampanyalar' },
  { path: '/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/push-notifications', icon: '🔔', label: 'Bildirimler' },
  { path: '/club/logs', icon: '📜', label: 'Log Kayıtları' },
  { path: '/club/profile', icon: '🏢', label: 'Kulüp Profili' },
  { path: '/club/insights', icon: '📈', label: 'İstatistikler' },
  { path: '/transaction-center', icon: '💳', label: 'İşlem Merkezi' },
];

const GENERIC_NAV: NavItem[] = [
  { path: '/club/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/club/profile', icon: '🏢', label: 'Profil Düzenle' },
  { path: '/services', icon: '📋', label: 'Hizmet Kataloğu' },
  { path: '/appointments', icon: '📅', label: 'Randevular (v2)' },
  { path: '/schedule-slots', icon: '🗓️', label: 'Slot Yönetimi' },
  { path: '/cafe-products', icon: '☕', label: 'Ürün Yönetimi' },
  { path: '/resource-management', icon: '🏟️', label: 'Kort & Slotlar' },
  { path: '/members', icon: '👥', label: 'Üyeler' },
  { path: '/push-notifications', icon: '🔔', label: 'Bildirimler' },
  { path: '/connections', icon: '🔗', label: 'Bağlantılar' },
  { path: '/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/events', icon: '📅', label: 'Etkinlikler' },
  { path: '/transaction-center', icon: '💳', label: 'İşlem Merkezi' },
];

const PLATFORM_NAV: NavItem[] = [
  { path: '/super-admin/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/super-admin/tenants', icon: '🏢', label: 'Kulüpler' },
  { path: '/super-admin/users', icon: '👥', label: 'Kullanıcılar' },
  { path: '/super-admin/trainers', icon: '🏋️', label: 'Eğitmenler' },
  { path: '/super-admin/discovery', icon: '🌐', label: 'Keşif Yönetimi' },
  { path: '/super-admin/push-notifications', icon: '🔔', label: 'Bildirimler' },
  { path: '/super-admin/leads', icon: '📋', label: 'Talepler' },
  { path: '/super-admin/messages', icon: '💬', label: 'Mesajlar' },
  { path: '/super-admin/audit', icon: '📜', label: 'Audit Log' },
  { path: '/platform/trainers/pending', icon: '⏳', label: 'Eğitmen Başvuruları' },
  { path: '/super-admin/events', icon: '📅', label: 'Etkinlik Onay' },
];

const TRAINER_NAV: NavItem[] = [
  { path: '/trainer/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/trainer/agenda', icon: '📅', label: 'Ajandam' },
  { path: '/trainer/profile', icon: '🏋️', label: 'Profilim' },
  { path: '/trainer/services', icon: '📦', label: 'Hizmet & Paket' },
  { path: '/trainer/students', icon: '👥', label: 'Öğrencilerim' },
  { path: '/trainer/events', icon: '🎯', label: 'Etkinliklerim' },
  { path: '/trainer/push-notifications', icon: '🔔', label: 'Bildirimler' },
  { path: '/trainer/messages', icon: '💬', label: 'Mesajlar' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string | null>(null);

  // Poll for badge counts + load club info
  const loadBadges = useCallback(async () => {
    if (!user) return;
    try {
      const counts: Record<string, number> = {};
      const unread = await apiJson<number>('/messages/unread-count');
      if (unread > 0) counts['/messages'] = unread;
      if (user.role === 'administrator') {
        try {
          const pending = await apiJson<Array<unknown>>('/admin/members?status=pending_approval');
          if (pending.length > 0) counts['/members'] = pending.length;
        } catch { /* */ }
        // Load club logo/name once
        if (!clubLogo && !clubName) {
          try {
            const profile = await apiJson<{ name: string; logoUrl: string | null }>('/admin/tenant/profile');
            setClubLogo(profile.logoUrl);
            setClubName(profile.name);
          } catch { /* */ }
        }
      }
      setBadges(counts);
    } catch { /* */ }
  }, [user, clubLogo, clubName]);

  useEffect(() => {
    if (!user) return;
    void loadBadges();
    const id = setInterval(() => { void loadBadges(); }, 15000);
    return () => clearInterval(id);
  }, [user, loadBadges]);

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
      {/* Hamburger Button (only when sidebar closed) */}
      {!sidebarOpen && (
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          title="Menüyü Aç"
        >
          ☰
        </button>
      )}

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          {clubLogo ? (
            <img src={clubLogo} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }} />
          ) : (
            <span className="sidebar-brand-icon">⚡</span>
          )}
          <span className="sidebar-brand-text">{clubName || (isWellness ? 'Skyland Wellness' : 'Wellness Club')}</span>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', padding: '4px' }}
            title="Menüyü Kapat"
          >
            ✕
          </button>
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
              {badges[item.path] && badges[item.path] > 0 && (
                <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, borderRadius: 9, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{badges[item.path]}</span>
              )}
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
