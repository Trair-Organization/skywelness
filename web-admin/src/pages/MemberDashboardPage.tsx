import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type TabKey = 'overview' | 'packages' | 'reservations' | 'appointments' | 'orders' | 'events' | 'connections' | 'messages' | 'notifications';

type Package = {
  id: string;
  remainingSessions: number;
  expiresAt: string;
  status: string;
  packageType: { id: string; name: string; sessionType: string };
};

type Reservation = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  trainer?: { user: { firstName: string; lastName: string } };
  package?: { packageType?: { name: string } };
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
  customerName: string;
  blockLabel: string;
  apartmentLabel: string;
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

type Connection = {
  linkId: string;
  trainerId: string;
  trainer: { firstName: string; lastName: string; photoUrl?: string | null };
};

export function MemberDashboardPage() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [packages, setPackages] = useState<Package[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [trainerCode, setTrainerCode] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [p, r, a, o, e, c, n, conn] = await Promise.allSettled([
        apiJson<Package[]>('/my-packages'),
        apiJson<Reservation[]>('/reservations?limit=20'),
        apiJson<Appointment[]>('/v2/appointments/my'),
        apiJson<CafeOrder[]>('/cafe/orders/my'),
        apiJson<Event[]>('/events/upcoming?limit=10'),
        apiJson<Conversation[]>('/messages/conversations'),
        apiJson<Notification[]>('/notifications'),
        apiJson<Connection[]>('/trainer-network/my-trainers'),
      ]);
      if (p.status === 'fulfilled') setPackages(p.value);
      if (r.status === 'fulfilled') setReservations(r.value);
      if (a.status === 'fulfilled') setAppointments(a.value);
      if (o.status === 'fulfilled') setOrders(o.value);
      if (e.status === 'fulfilled') setEvents(e.value);
      if (c.status === 'fulfilled') setConversations(c.value);
      if (n.status === 'fulfilled') setNotifications(n.value);
      if (conn.status === 'fulfilled') setConnections(conn.value);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  if (!user || !token) return <Navigate to="/login" replace />;
  if (user.role !== 'member') return <Navigate to="/" replace />;

  const activePackages = packages.filter(p => p.status === 'active' && p.remainingSessions > 0);
  const upcomingReservations = reservations.filter(r => new Date(r.startTime) > new Date() && r.status !== 'cancelled');
  const upcomingAppointments = appointments.filter(a => a.status !== 'cancelled');
  const joinedEvents = events.filter(e => e.isJoined);
  const unreadMessages = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const ptCredits = activePackages.filter(p => p.packageType?.sessionType === 'personal_training').reduce((s, p) => s + p.remainingSessions, 0);
  const massageCredits = activePackages.filter(p => p.packageType?.sessionType === 'massage').reduce((s, p) => s + p.remainingSessions, 0);

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <button
            className="topbar-icon-btn"
            title="Mesajlar"
            onClick={() => setActiveTab('messages')}
          >
            💬
            {unreadMessages > 0 && <span className="topbar-badge">{unreadMessages}</span>}
          </button>
          <button
            className="topbar-icon-btn"
            title="Bildirimler"
            onClick={() => setActiveTab('notifications')}
          >
            🔔
            {unreadNotifs > 0 && <span className="topbar-badge">{unreadNotifs}</span>}
          </button>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>👤 {user.firstName}</span>
          <button onClick={logout} className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Çıkış</button>
        </div>
      </nav>

      <div className="dashboard-page">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Merhaba, {user.firstName}! 👋</h1>
          <p>Hesap özetin ve aktivitelerini buradan yönetebilirsin.</p>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-icon">🏋️</span>
            <strong>{ptCredits}</strong>
            <span>PT Kredisi</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💆</span>
            <strong>{massageCredits}</strong>
            <span>Masaj Kredisi</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📅</span>
            <strong>{upcomingReservations.length + upcomingAppointments.length}</strong>
            <span>Yaklaşan Randevu</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎉</span>
            <strong>{joinedEvents.length}</strong>
            <span>Etkinlik</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          <button className={`dashboard-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Genel</button>
          <button className={`dashboard-tab ${activeTab === 'packages' ? 'active' : ''}`} onClick={() => setActiveTab('packages')}>💎 Paketler ({activePackages.length})</button>
          <button className={`dashboard-tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>📅 Randevular ({upcomingAppointments.length})</button>
          <button className={`dashboard-tab ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => setActiveTab('reservations')}>🏃 Rezervasyonlar ({upcomingReservations.length})</button>
          <button className={`dashboard-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>🛒 Siparişler ({orders.length})</button>
          <button className={`dashboard-tab ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>🎉 Etkinlikler ({joinedEvents.length})</button>
          <button className={`dashboard-tab ${activeTab === 'connections' ? 'active' : ''}`} onClick={() => setActiveTab('connections')}>🔗 Bağlantılar ({connections.length})</button>
          <button className={`dashboard-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>💬 Mesajlar {unreadMessages > 0 && `(${unreadMessages})`}</button>
          <button className={`dashboard-tab ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>🔔 Bildirimler {unreadNotifs > 0 && `(${unreadNotifs})`}</button>
        </div>

        {loading && <div className="dashboard-loading">Yükleniyor...</div>}

        {/* Tab Content */}
        {!loading && activeTab === 'overview' && (
          <div className="dashboard-content">
            <h2>Aktif Paketler</h2>
            {activePackages.length === 0 ? (
              <p className="dashboard-empty">Henüz aktif paketiniz yok. <Link to="/discover">Eğitmenleri keşfet</Link></p>
            ) : (
              <div className="dashboard-grid">
                {activePackages.slice(0, 3).map(p => (
                  <div key={p.id} className="dashboard-card">
                    <h3>{p.packageType.name}</h3>
                    <p className="dashboard-card-meta">{p.packageType.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}</p>
                    <div className="dashboard-card-stat">
                      <strong>{p.remainingSessions}</strong>
                      <span>kalan seans</span>
                    </div>
                    <p className="dashboard-card-meta">Geçerlilik: {new Date(p.expiresAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ marginTop: '2rem' }}>Yaklaşan Randevular</h2>
            {upcomingAppointments.length === 0 && upcomingReservations.length === 0 ? (
              <p className="dashboard-empty">Yaklaşan randevu yok. <Link to="/discover">Rezervasyon yap</Link></p>
            ) : (
              <div className="dashboard-list">
                {upcomingAppointments.slice(0, 5).map(a => (
                  <div key={a.id} className="dashboard-list-item">
                    <div>
                      <strong>{a.service.name}</strong>
                      <p>{new Date(a.slot.date).toLocaleDateString('tr-TR')} · {a.slot.startTime}-{a.slot.endTime}</p>
                    </div>
                    <span className={`status-badge status-${a.status}`}>{statusLabel(a.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'packages' && (
          <div className="dashboard-content">
            <h2>Paketlerim</h2>
            {packages.length === 0 ? (
              <p className="dashboard-empty">Henüz paket satın almadınız.</p>
            ) : (
              <div className="dashboard-grid">
                {packages.map(p => (
                  <div key={p.id} className="dashboard-card">
                    <h3>{p.packageType.name}</h3>
                    <p className="dashboard-card-meta">{p.packageType.sessionType === 'personal_training' ? '🏋️ Personal Training' : '💆 Masaj'}</p>
                    <div className="dashboard-card-stat">
                      <strong>{p.remainingSessions}</strong>
                      <span>kalan seans</span>
                    </div>
                    <p className="dashboard-card-meta">Bitiş: {new Date(p.expiresAt).toLocaleDateString('tr-TR')}</p>
                    <span className={`status-badge status-${p.status}`}>{p.status === 'active' ? 'Aktif' : p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'appointments' && (
          <div className="dashboard-content">
            <h2>Randevularım</h2>
            {appointments.length === 0 ? (
              <p className="dashboard-empty">Henüz randevu almadınız.</p>
            ) : (
              <div className="dashboard-list">
                {appointments.map(a => (
                  <div key={a.id} className="dashboard-list-item">
                    <div>
                      <strong>{a.service.name}</strong>
                      <p>{new Date(a.slot.date).toLocaleDateString('tr-TR')} · {a.slot.startTime}-{a.slot.endTime}</p>
                      <p className="dashboard-card-meta">{a.totalAmount}₺ · {a.paymentStatus === 'paid' ? '✅ Ödendi' : '⏳ Beklemede'}</p>
                    </div>
                    <span className={`status-badge status-${a.status}`}>{statusLabel(a.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'reservations' && (
          <div className="dashboard-content">
            <h2>Rezervasyonlarım (Mobil)</h2>
            {reservations.length === 0 ? (
              <p className="dashboard-empty">Henüz rezervasyon yok.</p>
            ) : (
              <div className="dashboard-list">
                {reservations.map(r => (
                  <div key={r.id} className="dashboard-list-item">
                    <div>
                      <strong>{r.trainer ? `${r.trainer.user.firstName} ${r.trainer.user.lastName}` : 'Eğitmen'}</strong>
                      <p>{new Date(r.startTime).toLocaleString('tr-TR')}</p>
                      <p className="dashboard-card-meta">{r.sessionType === 'personal_training' ? 'PT' : 'Masaj'} · {r.package?.packageType?.name}</p>
                    </div>
                    <span className={`status-badge status-${r.status}`}>{statusLabel(r.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'orders' && (
          <div className="dashboard-content">
            <h2>Siparişlerim</h2>
            {orders.length === 0 ? (
              <p className="dashboard-empty">Henüz sipariş vermediniz.</p>
            ) : (
              <div className="dashboard-list">
                {orders.map(o => (
                  <div key={o.id} className="dashboard-list-item">
                    <div>
                      <strong>SkyCafe Sipariş</strong>
                      <p>{o.items.map(i => `${i.title} x${i.quantity}`).join(', ')}</p>
                      <p className="dashboard-card-meta">{o.totalAmount}₺ · {o.paymentMethod === 'cash' ? '💵 Nakit' : '💳 Kart'} · {new Date(o.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                    <span className={`status-badge status-${o.status}`}>{orderStatusLabel(o.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'events' && (
          <div className="dashboard-content">
            <h2>Etkinliklerim</h2>
            {joinedEvents.length === 0 ? (
              <p className="dashboard-empty">Henüz etkinliğe katılmadınız. <Link to="/discover">Etkinlikleri keşfet</Link></p>
            ) : (
              <div className="dashboard-grid">
                {joinedEvents.map(e => (
                  <Link to={`/event/${e.id}`} key={e.id} className="dashboard-card">
                    {e.imageUrl && <img src={e.imageUrl} alt={e.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
                    <h3>{e.title}</h3>
                    <p className="dashboard-card-meta">📅 {new Date(e.startsAt).toLocaleDateString('tr-TR')}</p>
                    {e.location && <p className="dashboard-card-meta">📍 {e.location}</p>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'connections' && (
          <div className="dashboard-content">
            <h2>Bağlantılarım</h2>
            <div style={{ marginBottom: '1.5rem', padding: '1.25rem', borderRadius: 12, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
              <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.5rem' }}>🔗 Eğitmen Kodu Gir</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Eğitmeninizin size verdiği kodu girerek bağlanın.</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={trainerCode}
                  onChange={(e) => setTrainerCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.9rem', textTransform: 'uppercase' }}
                />
                <button
                  className="btn-primary"
                  disabled={!trainerCode.trim()}
                  onClick={async () => {
                    try {
                      await apiJson('/trainer-network/connect-by-code', { method: 'POST', body: JSON.stringify({ inviteCode: trainerCode.trim() }) });
                      setTrainerCode('');
                      void loadAll();
                      alert('Eğitmene bağlandınız!');
                    } catch (err) { alert(err instanceof Error ? err.message : 'Bağlanılamadı'); }
                  }}
                >Bağlan</button>
              </div>
            </div>
            {connections.length === 0 ? (
              <p className="dashboard-empty">Henüz hiçbir eğitmenle bağlantınız yok.</p>
            ) : (
              <div className="dashboard-grid">
                {connections.map(c => (
                  <div key={c.linkId} className="dashboard-card">
                    <h3>{c.trainer.firstName} {c.trainer.lastName}</h3>
                    <p className="dashboard-card-meta">Bağlı eğitmen</p>
                    <Link to={`/trainer/${c.trainerId}`} className="btn-outline" style={{ marginTop: '0.5rem', display: 'inline-block', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Profili Gör</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'messages' && (
          <div className="dashboard-content">
            <h2>Mesajlarım</h2>
            {conversations.length === 0 ? (
              <p className="dashboard-empty">Henüz mesajınız yok.</p>
            ) : (
              <div className="dashboard-list">
                {conversations.map(c => (
                  <div key={c.id} className="dashboard-list-item" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {c.otherUser.photoUrl ? (
                          <img src={c.otherUser.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: '#38bdf8', fontWeight: 800 }}>{c.otherUser.firstName[0]}</span>
                        )}
                      </div>
                      <div>
                        <strong>{c.otherUser.firstName} {c.otherUser.lastName}</strong>
                        <p>{c.lastMessage || 'Henüz mesaj yok'}</p>
                        {c.lastMessageAt && <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(c.lastMessageAt).toLocaleString('tr-TR')}</p>}
                      </div>
                    </div>
                    {c.unreadCount > 0 && <span className="topbar-badge" style={{ position: 'static' }}>{c.unreadCount}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'notifications' && (
          <div className="dashboard-content">
            <h2>Bildirimler</h2>
            {notifications.length === 0 ? (
              <p className="dashboard-empty">Henüz bildiriminiz yok.</p>
            ) : (
              <div className="dashboard-list">
                {notifications.map(n => (
                  <div key={n.id} className="dashboard-list-item" style={{ opacity: n.isRead ? 0.6 : 1 }}>
                    <div style={{ flex: 1 }}>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
                    </div>
                    {!n.isRead && <span className="topbar-badge" style={{ position: 'static' }}>Yeni</span>}
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
