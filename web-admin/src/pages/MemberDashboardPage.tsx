import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { readStoredTenantSubdomain, writeStoredTenantSubdomain } from '../auth/storage';

type TabKey =
  | 'overview'
  | 'clubs'
  | 'favorites'
  | 'appointments'
  | 'packages'
  | 'memberships'
  | 'reviews'
  | 'payments'
  | 'orders'
  | 'events'
  | 'messages'
  | 'notifications';

type Package = {
  id: string;
  remainingSessions: number;
  expiresAt: string;
  status: string;
  packageType: { id: string; name: string; sessionType: string };
};
type Appointment = {
  id: string;
  status: string;
  totalAmount: string;
  currency: string;
  paymentStatus: string;
  service: { name: string; category: string };
  slot: { date: string; startTime: string; endTime: string };
  createdAt: string;
};
type CafeOrder = {
  id: string;
  status: string;
  totalAmount: string;
  paymentMethod: string;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
  createdAt: string;
};
type Event = {
  id: string;
  title: string;
  startsAt: string;
  imageUrl: string | null;
  location: string | null;
  isJoined?: boolean;
};
type Conversation = {
  id: string;
  otherUser: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  lastMessage: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};
type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
};
type FavoriteItem = {
  id: string;
  type: 'club' | 'trainer';
  targetId: string;
  createdAt: string;
  club?: {
    name: string;
    subdomain: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    location: string | null;
    avgRating: string;
    services: string[];
  };
  trainer?: {
    id: string;
    name: string;
    photoUrl: string | null;
    avgRating: string;
    totalSessions: number;
  };
};
type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  club: { name: string; subdomain: string; logoUrl: string | null };
};
type MembershipItem = {
  id: string;
  membershipType: string;
  startDate: string;
  endDate: string;
  status: string;
  price: string;
  currency: string;
  club: { name: string; subdomain: string; logoUrl: string | null; location: string | null };
};
type PaymentItem = {
  id: string;
  amount: string;
  discountAmount: string;
  currency: string;
  status: string;
  receiptUrl: string | null;
  createdAt: string;
  package: { name: string; sessionType: string | null } | null;
};

export function MemberDashboardPage() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [packages, setPackages] = useState<Package[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [memberships, setMemberships] = useState<MembershipItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myClubs, setMyClubs] = useState<
    Array<{ id: string; name: string; subdomain: string; logoUrl: string | null; role: string }>
  >([]);
  const currentSubdomain = readStoredTenantSubdomain();

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        apiJson<Package[]>('/my-packages'),
        apiJson<Appointment[]>('/v2/appointments/my'),
        apiJson<CafeOrder[]>('/cafe/orders/my'),
        apiJson<Event[]>('/events/upcoming?limit=10'),
        apiJson<Conversation[]>('/messages/conversations'),
        apiJson<Notification[]>('/notifications'),
        apiJson<FavoriteItem[]>('/marketplace/me/favorites'),
        apiJson<ReviewItem[]>('/marketplace/me/reviews'),
        apiJson<MembershipItem[]>('/marketplace/me/memberships'),
        apiJson<PaymentItem[]>('/marketplace/me/payments'),
      ]);
      if (results[0].status === 'fulfilled') setPackages(results[0].value);
      if (results[1].status === 'fulfilled') setAppointments(results[1].value);
      if (results[2].status === 'fulfilled') setOrders(results[2].value);
      if (results[3].status === 'fulfilled') setEvents(results[3].value);
      if (results[4].status === 'fulfilled') setConversations(results[4].value);
      if (results[5].status === 'fulfilled') setNotifications(results[5].value);
      if (results[6].status === 'fulfilled') setFavorites(results[6].value);
      if (results[7].status === 'fulfilled') setReviews(results[7].value);
      if (results[8].status === 'fulfilled') setMemberships(results[8].value);
      if (results[9].status === 'fulfilled') setPayments(results[9].value);
      // Kulüplerim
      try {
        const clubs = await apiJson<
          Array<{
            membershipId: string;
            role: string;
            isCurrent: boolean;
            tenant: { id: string; name: string; subdomain: string; logoUrl: string | null };
          }>
        >('/auth/my-memberships');
        setMyClubs(
          clubs.map((m) => ({
            id: m.tenant.id,
            name: m.tenant.name,
            subdomain: m.tenant.subdomain,
            logoUrl: m.tenant.logoUrl,
            role: m.role,
          })),
        );
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'member') return <Navigate to="/" replace />;

  const activePackages = packages.filter((p) => p.status === 'active' && p.remainingSessions > 0);
  const upcomingAppointments = appointments.filter((a) => a.status !== 'cancelled');
  const joinedEvents = events.filter((e) => e.isJoined);
  const unreadMessages = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const activeMemberships = memberships.filter((m) => m.status === 'active');

  const ptCredits = activePackages
    .filter((p) => p.packageType?.sessionType === 'personal_training')
    .reduce((s, p) => s + p.remainingSessions, 0);
  const massageCredits = activePackages
    .filter((p) => p.packageType?.sessionType === 'massage')
    .reduce((s, p) => s + p.remainingSessions, 0);

  async function removeFavorite(favId: string) {
    try {
      await apiJson(`/marketplace/me/favorites/${favId}`, { method: 'DELETE' });
      setFavorites((prev) => prev.filter((f) => f.id !== favId));
    } catch {
      /* ignore */
    }
  }

  function switchClub(subdomain: string) {
    writeStoredTenantSubdomain(subdomain);
    window.location.reload();
  }

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link
          to="/"
          className="public-nav-brand"
          style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem', textDecoration: 'none' }}
        >
          WellnessClub
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <button
            className="topbar-icon-btn"
            title="Mesajlar"
            onClick={() => setActiveTab('messages')}
          >
            💬{unreadMessages > 0 && <span className="topbar-badge">{unreadMessages}</span>}
          </button>
          <button
            className="topbar-icon-btn"
            title="Bildirimler"
            onClick={() => setActiveTab('notifications')}
          >
            🔔{unreadNotifs > 0 && <span className="topbar-badge">{unreadNotifs}</span>}
          </button>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>👤 {user.firstName}</span>
          <button
            onClick={logout}
            className="btn-outline"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            Çıkış
          </button>
        </div>
      </nav>

      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Merhaba, {user.firstName}! 👋</h1>
          <p>Marketplace hesabın — favorilerin, randevuların ve daha fazlası.</p>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div
            className="stat-card"
            onClick={() => setActiveTab('favorites')}
            style={{ cursor: 'pointer' }}
          >
            <span className="stat-icon">❤️</span>
            <strong>{favorites.length}</strong>
            <span>Favori</span>
          </div>
          <div
            className="stat-card"
            onClick={() => setActiveTab('appointments')}
            style={{ cursor: 'pointer' }}
          >
            <span className="stat-icon">📅</span>
            <strong>{upcomingAppointments.length}</strong>
            <span>Randevu</span>
          </div>
          <div
            className="stat-card"
            onClick={() => setActiveTab('packages')}
            style={{ cursor: 'pointer' }}
          >
            <span className="stat-icon">🏋️</span>
            <strong>{ptCredits}</strong>
            <span>PT Kredisi</span>
          </div>
          <div
            className="stat-card"
            onClick={() => setActiveTab('packages')}
            style={{ cursor: 'pointer' }}
          >
            <span className="stat-icon">💆</span>
            <strong>{massageCredits}</strong>
            <span>Masaj Kredisi</span>
          </div>
          <div
            className="stat-card"
            onClick={() => setActiveTab('memberships')}
            style={{ cursor: 'pointer' }}
          >
            <span className="stat-icon">🏢</span>
            <strong>{activeMemberships.length}</strong>
            <span>Üyelik</span>
          </div>
          <div
            className="stat-card"
            onClick={() => setActiveTab('events')}
            style={{ cursor: 'pointer' }}
          >
            <span className="stat-icon">🎉</span>
            <strong>{joinedEvents.length}</strong>
            <span>Etkinlik</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          {(
            [
              ['overview', '📊 Genel'],
              ['clubs', `🏠 Kulüplerim (${myClubs.length})`],
              ['favorites', `❤️ Favorilerim (${favorites.length})`],
              ['appointments', `📅 Randevular (${upcomingAppointments.length})`],
              ['packages', `💎 Paketler (${activePackages.length})`],
              ['memberships', `🏢 Üyeliklerim (${activeMemberships.length})`],
              ['reviews', `⭐ Yorumlarım (${reviews.length})`],
              ['payments', `💳 Ödemeler (${payments.length})`],
              ['orders', `🛒 Siparişler (${orders.length})`],
              ['events', `🎉 Etkinlikler (${joinedEvents.length})`],
              ['messages', `💬 Mesajlar${unreadMessages > 0 ? ` (${unreadMessages})` : ''}`],
              ['notifications', `🔔 Bildirimler${unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}`],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={`dashboard-tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <div className="dashboard-loading">Yükleniyor...</div>}

        {/* ═══ KULÜPLERİM ═══ */}
        {!loading && activeTab === 'clubs' && (
          <div className="dashboard-content">
            <h2>🏠 Kulüplerim — Kulüp Değiştir</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Aktif kulüp:{' '}
              <strong style={{ color: '#38bdf8' }}>
                {myClubs.find((c) => c.subdomain === currentSubdomain)?.name || currentSubdomain}
              </strong>
            </p>
            {myClubs.length === 0 ? (
              <p className="dashboard-empty">
                Henüz bir kulübe üye değilsiniz. <Link to="/discover">Kulüpleri keşfet</Link>
              </p>
            ) : (
              <div className="dashboard-grid">
                {myClubs.map((club) => {
                  const isActive = club.subdomain === currentSubdomain;
                  return (
                    <div
                      key={club.id}
                      className="dashboard-card"
                      style={{
                        borderColor: isActive ? 'rgba(56,189,248,0.5)' : undefined,
                        position: 'relative',
                      }}
                    >
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            background: 'rgba(56,189,248,0.15)',
                            color: '#38bdf8',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            border: '1px solid rgba(56,189,248,0.3)',
                          }}
                        >
                          ✓ Aktif
                        </span>
                      )}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: 'rgba(56,189,248,0.08)',
                            border: '1px solid rgba(56,189,248,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {club.logoUrl ? (
                            <img
                              src={club.logoUrl}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                              {club.name.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{club.name}</h3>
                          <p className="dashboard-card-meta" style={{ margin: '2px 0 0' }}>
                            {club.role === 'administrator'
                              ? '👑 Yönetici'
                              : club.role === 'trainer'
                                ? '🏋️ Eğitmen'
                                : '👤 Üye'}
                          </p>
                        </div>
                      </div>
                      {!isActive ? (
                        <button
                          onClick={() => switchClub(club.subdomain)}
                          className="btn-primary"
                          style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                        >
                          Bu Kulübe Geç →
                        </button>
                      ) : (
                        <Link
                          to={`/club/${club.subdomain}`}
                          className="btn-outline"
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.6rem',
                            fontSize: '0.85rem',
                            textAlign: 'center',
                          }}
                        >
                          Kulüp Profilini Gör
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ OVERVIEW ═══ */}
        {!loading && activeTab === 'overview' && (
          <div className="dashboard-content">
            <h2>Aktif Paketler</h2>
            {activePackages.length === 0 ? (
              <p className="dashboard-empty">
                Henüz aktif paketiniz yok. <Link to="/discover">Kulüpleri keşfet</Link>
              </p>
            ) : (
              <div className="dashboard-grid">
                {activePackages.slice(0, 4).map((p) => (
                  <div key={p.id} className="dashboard-card">
                    <h3>{p.packageType.name}</h3>
                    <p className="dashboard-card-meta">
                      {p.packageType.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                    </p>
                    <div className="dashboard-card-stat">
                      <strong>{p.remainingSessions}</strong>
                      <span>kalan seans</span>
                    </div>
                    <p className="dashboard-card-meta">
                      Geçerlilik: {new Date(p.expiresAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <h2 style={{ marginTop: '2rem' }}>Yaklaşan Randevular</h2>
            {upcomingAppointments.length === 0 ? (
              <p className="dashboard-empty">
                Yaklaşan randevu yok. <Link to="/discover">Rezervasyon yap</Link>
              </p>
            ) : (
              <div className="dashboard-list">
                {upcomingAppointments.slice(0, 5).map((a) => (
                  <div key={a.id} className="dashboard-list-item">
                    <div>
                      <strong>{a.service.name}</strong>
                      <p>
                        {new Date(a.slot.date).toLocaleDateString('tr-TR')} · {a.slot.startTime}-
                        {a.slot.endTime}
                      </p>
                    </div>
                    <span className={`status-badge status-${a.status}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ FAVORİLERİM ═══ */}
        {!loading && activeTab === 'favorites' && (
          <div className="dashboard-content">
            <h2>❤️ Favorilerim</h2>
            {favorites.length === 0 ? (
              <p className="dashboard-empty">
                Henüz favoriniz yok. <Link to="/discover">Kulüpleri keşfet</Link> ve beğendiklerini
                favorilere ekle!
              </p>
            ) : (
              <div className="dashboard-grid">
                {favorites.map((f) =>
                  f.type === 'club' && f.club ? (
                    <div key={f.id} className="dashboard-card" style={{ position: 'relative' }}>
                      {f.club.coverImageUrl && (
                        <img
                          src={f.club.coverImageUrl}
                          alt=""
                          style={{
                            width: '100%',
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: '8px 8px 0 0',
                            marginBottom: 8,
                          }}
                        />
                      )}
                      <h3>{f.club.name}</h3>
                      {f.club.location && (
                        <p className="dashboard-card-meta">📍 {f.club.location}</p>
                      )}
                      {f.club.avgRating && Number(f.club.avgRating) > 0 && (
                        <p className="dashboard-card-meta">
                          ★ {Number(f.club.avgRating).toFixed(1)}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Link
                          to={`/club/${f.club.subdomain}`}
                          className="btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                        >
                          Profili Gör
                        </Link>
                        <button
                          onClick={() => removeFavorite(f.id)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(248,113,113,0.3)',
                            color: '#f87171',
                            padding: '0.4rem 0.8rem',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          Kaldır
                        </button>
                      </div>
                    </div>
                  ) : f.type === 'trainer' && f.trainer ? (
                    <div key={f.id} className="dashboard-card" style={{ position: 'relative' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
                      >
                        {f.trainer.photoUrl ? (
                          <img
                            src={f.trainer.photoUrl}
                            alt=""
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              background: 'rgba(56,189,248,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              color: '#38bdf8',
                            }}
                          >
                            {f.trainer.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.9rem' }}>{f.trainer.name}</h3>
                          <p className="dashboard-card-meta" style={{ margin: 0 }}>
                            ★ {Number(f.trainer.avgRating).toFixed(1)} · {f.trainer.totalSessions}{' '}
                            seans
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link
                          to={`/trainer/${f.trainer.id}`}
                          className="btn-primary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                        >
                          Profili Gör
                        </Link>
                        <button
                          onClick={() => removeFavorite(f.id)}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(248,113,113,0.3)',
                            color: '#f87171',
                            padding: '0.4rem 0.8rem',
                            borderRadius: 8,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          Kaldır
                        </button>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ RANDEVULAR ═══ */}
        {!loading && activeTab === 'appointments' && (
          <div className="dashboard-content">
            <h2>📅 Randevularım</h2>
            {appointments.length === 0 ? (
              <p className="dashboard-empty">
                Henüz randevu almadınız. <Link to="/discover">Kulüp keşfet ve randevu al</Link>
              </p>
            ) : (
              <div className="dashboard-list">
                {appointments.map((a) => (
                  <div key={a.id} className="dashboard-list-item">
                    <div>
                      <strong>{a.service.name}</strong>
                      <p>
                        {new Date(a.slot.date).toLocaleDateString('tr-TR')} · {a.slot.startTime}-
                        {a.slot.endTime}
                      </p>
                      <p className="dashboard-card-meta">
                        {a.totalAmount}₺ ·{' '}
                        {a.paymentStatus === 'paid' ? '✅ Ödendi' : '⏳ Beklemede'}
                      </p>
                    </div>
                    <span className={`status-badge status-${a.status}`}>
                      {statusLabel(a.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ PAKETLER ═══ */}
        {!loading && activeTab === 'packages' && (
          <div className="dashboard-content">
            <h2>💎 Paketlerim</h2>
            {packages.length === 0 ? (
              <p className="dashboard-empty">Henüz paket satın almadınız.</p>
            ) : (
              <div className="dashboard-grid">
                {packages.map((p) => (
                  <div key={p.id} className="dashboard-card">
                    <h3>{p.packageType.name}</h3>
                    <p className="dashboard-card-meta">
                      {p.packageType.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                    </p>
                    <div className="dashboard-card-stat">
                      <strong>{p.remainingSessions}</strong>
                      <span>kalan seans</span>
                    </div>
                    <p className="dashboard-card-meta">
                      Bitiş: {new Date(p.expiresAt).toLocaleDateString('tr-TR')}
                    </p>
                    <span className={`status-badge status-${p.status}`}>
                      {p.status === 'active'
                        ? 'Aktif'
                        : p.status === 'expired'
                          ? 'Süresi Doldu'
                          : p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ÜYELİKLERİM ═══ */}
        {!loading && activeTab === 'memberships' && (
          <div className="dashboard-content">
            <h2>🏢 Üyeliklerim</h2>
            {memberships.length === 0 ? (
              <p className="dashboard-empty">
                Henüz bir kulübe üyeliğiniz yok. <Link to="/discover">Kulüpleri keşfet</Link>
              </p>
            ) : (
              <div className="dashboard-list">
                {memberships.map((m) => (
                  <div key={m.id} className="dashboard-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {m.club.logoUrl && (
                        <img
                          src={m.club.logoUrl}
                          alt=""
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            objectFit: 'contain',
                            background: 'rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                      <div>
                        <strong>{m.club.name}</strong>
                        {m.club.location && (
                          <p className="dashboard-card-meta">📍 {m.club.location}</p>
                        )}
                        <p className="dashboard-card-meta">
                          {membershipTypeLabel(m.membershipType)} ·{' '}
                          {new Date(m.startDate).toLocaleDateString('tr-TR')} -{' '}
                          {new Date(m.endDate).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`status-badge status-${m.status}`}>
                        {membershipStatusLabel(m.status)}
                      </span>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontWeight: 700,
                          color: '#10b981',
                          fontSize: '0.9rem',
                        }}
                      >
                        {m.price}₺/ay
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ YORUMLARIM ═══ */}
        {!loading && activeTab === 'reviews' && (
          <div className="dashboard-content">
            <h2>⭐ Değerlendirmelerim</h2>
            {reviews.length === 0 ? (
              <p className="dashboard-empty">
                Henüz değerlendirme yapmadınız. Kulüp profillerinden yorum bırakabilirsiniz.
              </p>
            ) : (
              <div className="dashboard-list">
                {reviews.map((r) => (
                  <div key={r.id} className="dashboard-list-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      {r.club.logoUrl && (
                        <img
                          src={r.club.logoUrl}
                          alt=""
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            objectFit: 'contain',
                            background: 'rgba(0,0,0,0.2)',
                          }}
                        />
                      )}
                      <div>
                        <strong>
                          <Link
                            to={`/club/${r.club.subdomain}`}
                            style={{ color: '#e2e8f0', textDecoration: 'none' }}
                          >
                            {r.club.name}
                          </Link>
                        </strong>
                        <p style={{ color: '#fbbf24', fontSize: '0.82rem', margin: '2px 0' }}>
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </p>
                        {r.comment && (
                          <p className="dashboard-card-meta">
                            {r.comment.slice(0, 80)}
                            {r.comment.length > 80 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ÖDEME GEÇMİŞİ ═══ */}
        {!loading && activeTab === 'payments' && (
          <div className="dashboard-content">
            <h2>💳 Ödeme Geçmişi</h2>
            {payments.length === 0 ? (
              <p className="dashboard-empty">Henüz ödeme kaydınız yok.</p>
            ) : (
              <div className="dashboard-list">
                {payments.map((p) => (
                  <div key={p.id} className="dashboard-list-item">
                    <div>
                      <strong>{p.package?.name || 'Ödeme'}</strong>
                      {p.package?.sessionType && (
                        <p className="dashboard-card-meta">
                          {p.package.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                        </p>
                      )}
                      <p className="dashboard-card-meta">
                        {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, color: '#10b981', fontSize: '1rem', margin: 0 }}>
                        {p.amount}₺
                      </p>
                      {Number(p.discountAmount) > 0 && (
                        <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>
                          -{p.discountAmount}₺ indirim
                        </p>
                      )}
                      <span
                        className={`status-badge status-${p.status === 'succeeded' ? 'completed' : p.status}`}
                      >
                        {paymentStatusLabel(p.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ SİPARİŞLER ═══ */}
        {!loading && activeTab === 'orders' && (
          <div className="dashboard-content">
            <h2>🛒 Siparişlerim</h2>
            {orders.length === 0 ? (
              <p className="dashboard-empty">Henüz sipariş vermediniz.</p>
            ) : (
              <div className="dashboard-list">
                {orders.map((o) => (
                  <div key={o.id} className="dashboard-list-item">
                    <div>
                      <strong>SkyCafe Sipariş</strong>
                      <p>{o.items.map((i) => `${i.title} x${i.quantity}`).join(', ')}</p>
                      <p className="dashboard-card-meta">
                        {o.totalAmount}₺ · {new Date(o.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <span className={`status-badge status-${o.status}`}>
                      {orderStatusLabel(o.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ ETKİNLİKLER ═══ */}
        {!loading && activeTab === 'events' && (
          <div className="dashboard-content">
            <h2>🎉 Etkinliklerim</h2>
            {joinedEvents.length === 0 ? (
              <p className="dashboard-empty">
                Henüz etkinliğe katılmadınız. <Link to="/discover">Etkinlikleri keşfet</Link>
              </p>
            ) : (
              <div className="dashboard-grid">
                {joinedEvents.map((e) => (
                  <Link to={`/event/${e.id}`} key={e.id} className="dashboard-card">
                    {e.imageUrl && (
                      <img
                        src={e.imageUrl}
                        alt={e.title}
                        style={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      />
                    )}
                    <h3>{e.title}</h3>
                    <p className="dashboard-card-meta">
                      📅 {new Date(e.startsAt).toLocaleDateString('tr-TR')}
                    </p>
                    {e.location && <p className="dashboard-card-meta">📍 {e.location}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ MESAJLAR ═══ */}
        {!loading && activeTab === 'messages' && (
          <div className="dashboard-content">
            <h2>💬 Mesajlarım</h2>
            {conversations.length === 0 ? (
              <p className="dashboard-empty">Henüz mesajınız yok.</p>
            ) : (
              <div className="dashboard-list">
                {conversations.map((c) => (
                  <div key={c.id} className="dashboard-list-item" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'rgba(56,189,248,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {c.otherUser.photoUrl ? (
                          <img
                            src={c.otherUser.photoUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ color: '#38bdf8', fontWeight: 800 }}>
                            {c.otherUser.firstName[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <strong>
                          {c.otherUser.firstName} {c.otherUser.lastName}
                        </strong>
                        <p>{c.lastMessage || c.lastMessagePreview || 'Henüz mesaj yok'}</p>
                      </div>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="topbar-badge" style={{ position: 'static' }}>
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ BİLDİRİMLER ═══ */}
        {!loading && activeTab === 'notifications' && (
          <div className="dashboard-content">
            <h2>🔔 Bildirimler</h2>
            {notifications.length === 0 ? (
              <p className="dashboard-empty">Henüz bildiriminiz yok.</p>
            ) : (
              <div className="dashboard-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="dashboard-list-item"
                    style={{ opacity: n.isRead ? 0.6 : 1 }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <p style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {new Date(n.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="topbar-badge" style={{ position: 'static' }}>
                        Yeni
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
    no_show: 'Gelinmedi',
  };
  return map[s] || s;
}
function orderStatusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: 'Onay Bekliyor',
    preparing: 'Hazırlanıyor',
    delivered: 'Teslim Edildi',
    completed: 'Tamamlandı',
    cancelled: 'İptal',
  };
  return map[s] || s;
}
function membershipTypeLabel(t: string): string {
  const map: Record<string, string> = { monthly: 'Aylık', yearly: 'Yıllık', unlimited: 'Sınırsız' };
  return map[t] || t;
}
function membershipStatusLabel(s: string): string {
  const map: Record<string, string> = {
    active: 'Aktif',
    expired: 'Süresi Doldu',
    frozen: 'Donduruldu',
    cancelled: 'İptal',
  };
  return map[s] || s;
}
function paymentStatusLabel(s: string): string {
  const map: Record<string, string> = {
    succeeded: 'Ödendi',
    pending: 'Beklemede',
    failed: 'Başarısız',
    refunded: 'İade Edildi',
  };
  return map[s] || s;
}
