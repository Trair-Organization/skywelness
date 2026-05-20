import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { readStoredTenantSubdomain, writeStoredTenantSubdomain } from '../auth/storage';

type TabKey =
  | 'overview'
  | 'clubs'
  | 'trainers'
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
  const [myTrainers, setMyTrainers] = useState<
    Array<{
      linkId: string;
      trainerId: string;
      trainer: { firstName: string; lastName: string; photoUrl?: string | null };
    }>
  >([]);
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
      // Eğitmenlerim
      try {
        const trainers = await apiJson<
          Array<{
            linkId: string;
            trainerId: string;
            trainer: { firstName: string; lastName: string; photoUrl?: string | null };
          }>
        >('/trainer-network/my-trainers');
        setMyTrainers(trainers);
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
          {/* Profile Avatar + Dropdown */}
          <ProfileMenu user={user} logout={logout} setActiveTab={setActiveTab} />
        </div>
      </nav>

      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Merhaba, {user.firstName}! 👋</h1>
        </div>

        {/* Compact Stat Bar */}
        <div className="member-stat-bar">
          <div className="member-stat-item" onClick={() => setActiveTab('favorites')}>
            <span className="member-stat-num">{favorites.length}</span>
            <span className="member-stat-label">Favori</span>
          </div>
          <div className="member-stat-divider" />
          <div className="member-stat-item" onClick={() => setActiveTab('appointments')}>
            <span className="member-stat-num">{upcomingAppointments.length}</span>
            <span className="member-stat-label">Randevu</span>
          </div>
          <div className="member-stat-divider" />
          <div className="member-stat-item" onClick={() => setActiveTab('packages')}>
            <span className="member-stat-num">{ptCredits + massageCredits}</span>
            <span className="member-stat-label">Kredi</span>
          </div>
          <div className="member-stat-divider" />
          <div className="member-stat-item" onClick={() => setActiveTab('memberships')}>
            <span className="member-stat-num">{activeMemberships.length}</span>
            <span className="member-stat-label">Üyelik</span>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="member-menu-grid">
          {(
            [
              ['clubs', '🏠', 'Kulüplerim'],
              ['trainers', '🏋️', 'Eğitmenlerim'],
              ['favorites', '❤️', 'Favorilerim'],
              ['appointments', '📅', 'Randevular'],
              ['packages', '💎', 'Paketlerim'],
              ['memberships', '🏢', 'Üyeliklerim'],
              ['reviews', '⭐', 'Yorumlarım'],
              ['payments', '💳', 'Ödemeler'],
              ['orders', '🛒', 'Siparişler'],
              ['events', '🎉', 'Etkinlikler'],
              ['messages', '💬', `Mesajlar${unreadMessages > 0 ? ` (${unreadMessages})` : ''}`],
              ['notifications', '🔔', `Bildirimler${unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}`],
            ] as [TabKey, string, string][]
          ).map(([key, icon, label]) => (
            <button
              key={key}
              className={`member-menu-item ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span className="member-menu-icon">{icon}</span>
              <span className="member-menu-label">{label}</span>
              {key === 'messages' && unreadMessages > 0 && (
                <span className="member-menu-badge">{unreadMessages}</span>
              )}
              {key === 'notifications' && unreadNotifs > 0 && (
                <span className="member-menu-badge">{unreadNotifs}</span>
              )}
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

        {/* ═══ EĞİTMENLERİM ═══ */}
        {!loading && activeTab === 'trainers' && (
          <div className="dashboard-content">
            <h2>🏋️ Eğitmenlerim</h2>
            {myTrainers.length === 0 ? (
              <p className="dashboard-empty">
                Henüz bağlı eğitmeniniz yok. Kulüp profilinden veya eğitmen kodunu girerek
                bağlanabilirsiniz.
              </p>
            ) : (
              <div className="dashboard-grid">
                {myTrainers.map((t) => (
                  <Link
                    key={t.linkId}
                    to={`/trainer/${t.trainerId}`}
                    className="dashboard-card"
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(56,189,248,0.1)',
                          border: '1px solid rgba(56,189,248,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {t.trainer.photoUrl ? (
                          <img
                            src={t.trainer.photoUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1rem' }}>
                            {t.trainer.firstName[0]}
                            {t.trainer.lastName[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#f1f5f9' }}>
                          {t.trainer.firstName} {t.trainer.lastName}
                        </h3>
                        <p className="dashboard-card-meta" style={{ margin: '2px 0 0' }}>
                          Bağlı Eğitmen
                        </p>
                      </div>
                    </div>
                    <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>
                      Profili Gör →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ OVERVIEW ═══ */}
        {!loading && activeTab === 'overview' && (
          <div className="dashboard-content">
            {/* Aktif Kulüp Kartı */}
            {currentSubdomain && myClubs.length > 0 && (
              <div className="overview-club-card">
                <div className="overview-club-info">
                  <div className="overview-club-logo">
                    {myClubs.find((c) => c.subdomain === currentSubdomain)?.logoUrl ? (
                      <img
                        src={myClubs.find((c) => c.subdomain === currentSubdomain)!.logoUrl!}
                        alt=""
                      />
                    ) : (
                      <span>
                        {(myClubs.find((c) => c.subdomain === currentSubdomain)?.name || 'K').slice(
                          0,
                          2,
                        )}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong>
                      {myClubs.find((c) => c.subdomain === currentSubdomain)?.name ||
                        currentSubdomain}
                    </strong>
                    <p>Aktif kulübün</p>
                  </div>
                </div>
                <Link to={`/club/${currentSubdomain}`} className="overview-club-link">
                  Kulüp Profili →
                </Link>
              </div>
            )}

            {/* Yaklaşan Randevu (büyük kart) */}
            {upcomingAppointments.length > 0 && (
              <div className="overview-next-appt">
                <div className="overview-next-label">Sonraki Randevun</div>
                <div className="overview-next-body">
                  <div className="overview-next-time">
                    <span className="overview-next-date">
                      {new Date(upcomingAppointments[0].slot.date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="overview-next-hour">
                      {upcomingAppointments[0].slot.startTime}
                    </span>
                  </div>
                  <div className="overview-next-details">
                    <strong>{upcomingAppointments[0].service.name}</strong>
                    <p>
                      {upcomingAppointments[0].slot.startTime} -{' '}
                      {upcomingAppointments[0].slot.endTime}
                    </p>
                  </div>
                  <span className={`status-badge status-${upcomingAppointments[0].status}`}>
                    {statusLabel(upcomingAppointments[0].status)}
                  </span>
                </div>
              </div>
            )}

            {/* Kalan Krediler */}
            {(ptCredits > 0 || massageCredits > 0) && (
              <div className="overview-credits">
                {ptCredits > 0 && (
                  <div className="overview-credit-item">
                    <span className="overview-credit-icon">🏋️</span>
                    <div>
                      <strong>{ptCredits}</strong>
                      <span>PT Kredisi</span>
                    </div>
                  </div>
                )}
                {massageCredits > 0 && (
                  <div className="overview-credit-item">
                    <span className="overview-credit-icon">💆</span>
                    <div>
                      <strong>{massageCredits}</strong>
                      <span>Masaj Kredisi</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hızlı Aksiyonlar */}
            <div className="overview-actions">
              <Link to="/discover" className="overview-action-btn">
                🔍 Kulüp Keşfet
              </Link>
              <button className="overview-action-btn" onClick={() => setActiveTab('appointments')}>
                📅 Randevularım
              </button>
              <Link to="/dashboard/progress" className="overview-action-btn">
                📊 İlerlemem
              </Link>
              <button className="overview-action-btn" onClick={() => setActiveTab('messages')}>
                💬 Mesajlar
              </button>
            </div>

            {/* Yaklaşan Randevular Listesi */}
            {upcomingAppointments.length > 1 && (
              <>
                <h3 className="overview-section-title">Diğer Randevular</h3>
                <div className="dashboard-list">
                  {upcomingAppointments.slice(1, 4).map((a) => (
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
              </>
            )}

            {/* Boş State */}
            {upcomingAppointments.length === 0 && activePackages.length === 0 && (
              <div className="overview-empty">
                <span>🌟</span>
                <h3>Wellness yolculuğuna başla!</h3>
                <p>Kulüpleri keşfet, eğitmenlerle tanış ve ilk randevunu al.</p>
                <Link to="/discover" className="btn-primary" style={{ marginTop: 12 }}>
                  Keşfetmeye Başla
                </Link>
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
            <MessagesView
              conversations={conversations}
              onConversationRead={(convId) => {
                setConversations((prev) =>
                  prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)),
                );
              }}
            />
          </div>
        )}

        {/* ═══ BİLDİRİMLER ═══ */}
        {!loading && activeTab === 'notifications' && (
          <div className="dashboard-content">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>🔔 Bildirimler</h2>
              <button
                onClick={() => {
                  apiJson('/notifications/read-all', { method: 'POST' }).catch(() => {});
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                }}
                disabled={!notifications.some((n) => !n.isRead)}
                style={{
                  background: notifications.some((n) => !n.isRead)
                    ? 'rgba(56,189,248,0.1)'
                    : 'rgba(148,163,184,0.05)',
                  border: `1px solid ${notifications.some((n) => !n.isRead) ? 'rgba(56,189,248,0.25)' : 'rgba(148,163,184,0.12)'}`,
                  color: notifications.some((n) => !n.isRead) ? '#38bdf8' : '#64748b',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: notifications.some((n) => !n.isRead) ? 'pointer' : 'default',
                  opacity: notifications.some((n) => !n.isRead) ? 1 : 0.5,
                }}
              >
                ✓ Tümünü Oku
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="dashboard-empty">Henüz bildiriminiz yok.</p>
            ) : (
              <div className="dashboard-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="dashboard-list-item"
                    style={{
                      opacity: n.isRead ? 0.6 : 1,
                      cursor: !n.isRead ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (!n.isRead) {
                        apiJson(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {});
                        setNotifications((prev) =>
                          prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
                        );
                      }
                    }}
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

// ─── Messages View (Professional Chat UI) ────────────────────────────────────

type MessageItem = {
  id: string;
  content: string;
  isOwn: boolean;
  createdAt: string;
  senderId: string;
};

function MessagesView({
  conversations,
  onConversationRead,
}: {
  conversations: Conversation[];
  onConversationRead: (id: string) => void;
}) {
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedConv);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openConversation(convId: string) {
    setSelectedConv(convId);
    setLoadingMsgs(true);
    setShowActions(false);
    try {
      const data = await apiJson<MessageItem[]>(`/messages/conversations/${convId}`);
      setMessages(Array.isArray(data) ? data : []);
      onConversationRead(convId);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    try {
      await apiJson(`/messages/conversations/${selectedConv}`, {
        method: 'POST',
        body: JSON.stringify({ content: newMsg.trim() }),
      });
      setNewMsg('');
      const data = await apiJson<MessageItem[]>(`/messages/conversations/${selectedConv}`);
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  async function blockUser() {
    if (!selectedConversation) return;
    if (
      !confirm(
        `${selectedConversation.otherUser.firstName} ${selectedConversation.otherUser.lastName} kişisini engellemek istediğinize emin misiniz?`,
      )
    )
      return;
    setActionLoading(true);
    try {
      await apiJson(`/messages/users/${selectedConversation.otherUser.id}/block`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      alert('Kullanıcı engellendi.');
      setSelectedConv(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  }

  async function deleteConversation() {
    if (!selectedConv) return;
    if (!confirm('Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    setActionLoading(true);
    try {
      await apiJson(`/messages/conversations/${selectedConv}`, { method: 'DELETE' });
      setSelectedConv(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  }

  async function reportUser() {
    if (!selectedConversation) return;
    const reason = prompt('Şikayet nedeninizi kısaca yazın:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await apiJson('/messages/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: selectedConversation.otherUser.id,
          conversationId: selectedConv,
          category: 'inappropriate',
          description: reason,
        }),
      });
      alert('Şikayetiniz iletildi. Teşekkürler.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'İşlem başarısız');
    } finally {
      setActionLoading(false);
      setShowActions(false);
    }
  }

  // ═══ CONVERSATION DETAIL ═══
  if (selectedConv && selectedConversation) {
    return (
      <div className="chat-detail">
        {/* Chat Header */}
        <div className="chat-header">
          <button className="chat-back-btn" onClick={() => setSelectedConv(null)}>
            ←
          </button>
          <div className="chat-header-user">
            <div className="chat-avatar">
              {selectedConversation.otherUser.photoUrl ? (
                <img src={selectedConversation.otherUser.photoUrl} alt="" />
              ) : (
                <span>{selectedConversation.otherUser.firstName[0]}</span>
              )}
            </div>
            <div>
              <strong>
                {selectedConversation.otherUser.firstName} {selectedConversation.otherUser.lastName}
              </strong>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <button className="chat-actions-btn" onClick={() => setShowActions(!showActions)}>
              ⋮
            </button>
            {showActions && (
              <div className="chat-actions-menu">
                <button onClick={blockUser} disabled={actionLoading}>
                  🚫 Engelle
                </button>
                <button onClick={reportUser} disabled={actionLoading}>
                  ⚠️ Şikayet Et
                </button>
                <button onClick={deleteConversation} disabled={actionLoading}>
                  🗑️ Sohbeti Sil
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="chat-messages">
          {loadingMsgs ? (
            <div className="chat-loading">Mesajlar yükleniyor...</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <span>💬</span>
              <p>Henüz mesaj yok. İlk mesajı gönderin!</p>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => {
                const showDate =
                  idx === 0 ||
                  new Date(m.createdAt).toDateString() !==
                    new Date(messages[idx - 1].createdAt).toDateString();
                return (
                  <div key={m.id} className={`chat-msg-row ${m.isOwn ? 'own' : 'other'}`}>
                    {showDate && (
                      <div className="chat-date-sep">
                        {new Date(m.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                    )}
                    <div className={`chat-bubble ${m.isOwn ? 'own' : 'other'}`}>
                      <p>{m.content}</p>
                      <span className="chat-time">
                        {new Date(m.createdAt).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        <div className="chat-input-bar">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Mesajınızı yazın..."
            className="chat-input"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={sending || !newMsg.trim()}
            className="chat-send-btn"
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>
    );
  }

  // ═══ CONVERSATION LIST ═══
  return (
    <div>
      <h2>💬 Mesajlarım</h2>
      {conversations.length === 0 ? (
        <p className="dashboard-empty">Henüz mesajınız yok.</p>
      ) : (
        <div className="chat-list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`chat-list-item ${c.unreadCount > 0 ? 'unread' : ''}`}
              onClick={() => openConversation(c.id)}
            >
              <div className="chat-avatar">
                {c.otherUser.photoUrl ? (
                  <img src={c.otherUser.photoUrl} alt="" />
                ) : (
                  <span>{c.otherUser.firstName[0]}</span>
                )}
              </div>
              <div className="chat-list-info">
                <div className="chat-list-top">
                  <strong>
                    {c.otherUser.firstName} {c.otherUser.lastName}
                  </strong>
                  {c.lastMessageAt && (
                    <span className="chat-list-time">
                      {new Date(c.lastMessageAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>
                <p className="chat-list-preview">
                  {c.lastMessage || c.lastMessagePreview || 'Henüz mesaj yok'}
                </p>
              </div>
              {c.unreadCount > 0 && <span className="chat-badge">{c.unreadCount}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Profile Menu Component ──────────────────────────────────────────────────

function ProfileMenu({
  user,
  logout,
  setActiveTab,
}: {
  user: { firstName: string; lastName: string; email: string };
  logout: () => void;
  setActiveTab: (tab: TabKey) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button className="pm-avatar-btn" onClick={() => setOpen(!open)}>
        <span>
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
      </button>
      {open && (
        <>
          <div className="pm-overlay" onClick={() => setOpen(false)} />
          <div className="pm-dropdown">
            <div className="pm-header">
              <div className="pm-header-avatar">
                <span>
                  {user.firstName[0]}
                  {user.lastName[0]}
                </span>
              </div>
              <div className="pm-header-info">
                <strong>
                  {user.firstName} {user.lastName}
                </strong>
                <p>{user.email}</p>
              </div>
            </div>
            <div className="pm-divider" />
            <button
              className="pm-item"
              onClick={() => {
                setActiveTab('overview');
                setOpen(false);
              }}
            >
              <span className="pm-item-icon">👤</span> Profilim
            </button>
            <button
              className="pm-item"
              onClick={() => {
                setActiveTab('clubs');
                setOpen(false);
              }}
            >
              <span className="pm-item-icon">🏠</span> Kulüplerim
            </button>
            <button
              className="pm-item"
              onClick={() => {
                setActiveTab('payments');
                setOpen(false);
              }}
            >
              <span className="pm-item-icon">💳</span> Ödemelerim
            </button>
            <div className="pm-divider" />
            <button className="pm-item pm-item-disabled" disabled>
              <span className="pm-item-icon">🍎</span> Sağlık Verileri{' '}
              <span className="pm-soon">Yakında</span>
            </button>
            <button className="pm-item pm-item-disabled" disabled>
              <span className="pm-item-icon">⚙️</span> Hesap Ayarları{' '}
              <span className="pm-soon">Yakında</span>
            </button>
            <div className="pm-divider" />
            <button className="pm-item pm-item-danger" onClick={logout}>
              <span className="pm-item-icon">🚪</span> Çıkış Yap
            </button>
          </div>
        </>
      )}
    </div>
  );
}
