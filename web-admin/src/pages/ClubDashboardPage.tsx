import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { readStoredTenantSubdomain } from '../auth/storage';

function timeAgo(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  totalTrainers: number;
  totalEvents: number;
  upcomingEvents: number;
  newMembersThisMonth: number;
  todayBookings: Array<{
    id: string;
    time: string;
    status: string;
    sessionType: string;
    trainerName: string | null;
    memberName: string | null;
  }>;
  todayBookingsCount: number;
  monthlyRevenue: number;
  monthlyPackagesSold: number;
};

type RecentMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountStatus: string;
  createdAt: string;
};

type ActivityItem = {
  type: string;
  message: string;
  time: string;
};

export function ClubDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubInviteCode, setClubInviteCode] = useState('');
  const [visibilityMode, setVisibilityMode] = useState<'public' | 'private' | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, members, acts] = await Promise.all([
        apiJson<DashboardStats>('/admin/stats'),
        apiJson<RecentMember[]>('/admin/members?status=all'),
        apiJson<ActivityItem[]>('/admin/activity'),
      ]);
      setStats(s);
      setRecentMembers(members.slice(0, 5));
      setActivities(acts);
    } catch {
      // ignore
    }
    // Fetch invite code separately (don't block dashboard)
    try {
      const codeRes = await apiJson<{ inviteCode: string }>('/admin/club-invite-code');
      setClubInviteCode(codeRes.inviteCode);
    } catch {
      // ignore
    }
    // Fetch current tenant's visibility mode
    try {
      const sub = readStoredTenantSubdomain();
      if (sub) {
        const tenantInfo = await apiJson<{ visibilityMode?: 'public' | 'private' }>(
          `/tenants/by-subdomain/${encodeURIComponent(sub)}`,
          { auth: false },
        );
        setVisibilityMode(tenantInfo.visibilityMode ?? 'private');
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const tenantSubdomain = readStoredTenantSubdomain();
  const isWellness = tenantSubdomain === 'skyland-wellness';

  if (loading || !stats) {
    return (
      <div className="dashboard-page">
        <p className="muted">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            {isWellness ? 'Skyland Wellness Club yönetim paneli' : 'Yönetim Paneli'}
          </p>
        </div>
        <button className="btn-refresh" onClick={() => void load()}>
          🔄 Yenile
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/members')}>
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalMembers}</span>
            <span className="stat-label">Toplam Üye</span>
          </div>
          <div className="stat-badge stat-badge-blue">{stats.activeMembers} aktif</div>
        </div>

        <div
          className="stat-card stat-card-warning"
          onClick={() => navigate('/members?status=pending_approval')}
        >
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingMembers}</span>
            <span className="stat-label">Onay Bekleyen</span>
          </div>
          {stats.pendingMembers > 0 && (
            <div className="stat-badge stat-badge-orange">Aksiyon gerekli</div>
          )}
        </div>

        {isWellness && (
          <div className="stat-card" onClick={() => navigate('/trainers')}>
            <div className="stat-icon">🏋️</div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalTrainers}</span>
              <span className="stat-label">Eğitmen</span>
            </div>
          </div>
        )}

        <div className="stat-card" onClick={() => navigate('/events')}>
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <span className="stat-value">{stats.upcomingEvents}</span>
            <span className="stat-label">Yaklaşan Etkinlik</span>
          </div>
          <div className="stat-badge stat-badge-green">{stats.totalEvents} toplam</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <span className="stat-value">{stats.newMembersThisMonth}</span>
            <span className="stat-label">Bu Ay Yeni Üye</span>
          </div>
        </div>

        {isWellness && (
          <div className="stat-card" onClick={() => navigate('/spa')}>
            <div className="stat-icon">🧖</div>
            <div className="stat-content">
              <span className="stat-value">Spa</span>
              <span className="stat-label">Spa & Wellness</span>
            </div>
          </div>
        )}

        {!isWellness && (
          <div className="stat-card" onClick={() => navigate('/resource-management')}>
            <div className="stat-icon">🏟️</div>
            <div className="stat-content">
              <span className="stat-value">Kaynaklar</span>
              <span className="stat-label">Kort & Slotlar</span>
            </div>
          </div>
        )}
      </div>

      {/* Kulüp Davet Kodu */}
      <div className="dashboard-section" style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: '12px',
          }}
        >
          <div style={{ fontSize: '2rem' }}>🔗</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#e2e8f0' }}>Kulüp Davet Kodu</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
              Eğitmenler bu kodla kulübünüze başvurabilir
            </div>
          </div>
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#38bdf8',
              fontFamily: 'monospace',
            }}
          >
            {clubInviteCode || '...'}
          </div>
          <button
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(56,189,248,0.3)',
              background: 'rgba(56,189,248,0.1)',
              color: '#38bdf8',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
            onClick={() => {
              if (clubInviteCode) {
                navigator.clipboard.writeText(clubInviteCode);
                alert('Kod kopyalandı!');
              }
            }}
          >
            📋 Kopyala
          </button>
        </div>
      </div>

      {/* Kulüp Görünürlüğü (Public / Private) */}
      {visibilityMode && (
        <div className="dashboard-section" style={{ marginTop: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              background:
                visibilityMode === 'public' ? 'rgba(52,211,153,0.06)' : 'rgba(139,92,246,0.06)',
              border:
                visibilityMode === 'public'
                  ? '1px solid rgba(52,211,153,0.25)'
                  : '1px solid rgba(139,92,246,0.25)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ fontSize: '2rem' }}>{visibilityMode === 'public' ? '🌍' : '🔒'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0' }}>
                  Kulüp Görünürlüğü:{' '}
                  {visibilityMode === 'public'
                    ? 'Public (Marketplace)'
                    : 'Private (Kapalı Topluluk)'}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    marginTop: '2px',
                    lineHeight: 1.5,
                  }}
                >
                  {visibilityMode === 'public'
                    ? 'Platformdaki tüm kullanıcılar üye olmadan kulübünüzde rezervasyon yapabilir.'
                    : 'Sadece onayladığınız üyeler kulübünüzün hizmetlerini görüp rezervasyon yapabilir. Diğer kullanıcılar "Üyelik Başvurusu" bırakabilir.'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={async () => {
                  if (visibilityMode === 'public') return;
                  if (
                    !confirm(
                      'Kulübünüzü Public yapmak istediğinize emin misiniz? Sisteme kayıtlı TÜM kullanıcılar rezervasyon yapabilir.',
                    )
                  )
                    return;
                  setSavingVisibility(true);
                  try {
                    await apiJson('/admin/tenant/visibility', {
                      method: 'PATCH',
                      body: JSON.stringify({ visibilityMode: 'public' }),
                    });
                    setVisibilityMode('public');
                    alert('✅ Kulüp artık Public');
                  } catch (e) {
                    alert(`Hata: ${e instanceof Error ? e.message : 'İşlem başarısız'}`);
                  } finally {
                    setSavingVisibility(false);
                  }
                }}
                disabled={savingVisibility || visibilityMode === 'public'}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border:
                    visibilityMode === 'public'
                      ? '1px solid rgba(52,211,153,0.5)'
                      : '1px solid rgba(148,163,184,0.2)',
                  background: visibilityMode === 'public' ? 'rgba(52,211,153,0.12)' : 'transparent',
                  color: visibilityMode === 'public' ? '#34d399' : '#94a3b8',
                  fontWeight: 700,
                  cursor: visibilityMode === 'public' ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                🌍 Public
              </button>
              <button
                onClick={async () => {
                  if (visibilityMode === 'private') return;
                  if (
                    !confirm(
                      'Kulübünüzü Private yapmak istediğinize emin misiniz? Sadece onayladığınız üyeler rezervasyon yapabilir.',
                    )
                  )
                    return;
                  setSavingVisibility(true);
                  try {
                    await apiJson('/admin/tenant/visibility', {
                      method: 'PATCH',
                      body: JSON.stringify({ visibilityMode: 'private' }),
                    });
                    setVisibilityMode('private');
                    alert('✅ Kulüp artık Private');
                  } catch (e) {
                    alert(`Hata: ${e instanceof Error ? e.message : 'İşlem başarısız'}`);
                  } finally {
                    setSavingVisibility(false);
                  }
                }}
                disabled={savingVisibility || visibilityMode === 'private'}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border:
                    visibilityMode === 'private'
                      ? '1px solid rgba(139,92,246,0.5)'
                      : '1px solid rgba(148,163,184,0.2)',
                  background:
                    visibilityMode === 'private' ? 'rgba(139,92,246,0.12)' : 'transparent',
                  color: visibilityMode === 'private' ? '#a78bfa' : '#94a3b8',
                  fontWeight: 700,
                  cursor: visibilityMode === 'private' ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                🔒 Private
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Erişim */}
      <div className="dashboard-section">
        <h2 className="section-title">Hızlı Erişim</h2>
        <div className="quick-actions">
          <button
            className="quick-action-btn"
            onClick={() => navigate('/members?status=pending_approval')}
          >
            <span className="qa-icon">✅</span>
            <span>Üye Onayları</span>
            {stats.pendingMembers > 0 && <span className="qa-badge">{stats.pendingMembers}</span>}
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/events')}>
            <span className="qa-icon">➕</span>
            <span>Etkinlik Oluştur</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/leads')}>
            <span className="qa-icon">📋</span>
            <span>Gelen Talepler</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/messages')}>
            <span className="qa-icon">💬</span>
            <span>Mesajlar</span>
          </button>
          {isWellness && (
            <button className="quick-action-btn" onClick={() => navigate('/spa')}>
              <span className="qa-icon">🧖</span>
              <span>Spa Yönetimi</span>
            </button>
          )}
          {!isWellness && (
            <button className="quick-action-btn" onClick={() => navigate('/resource-management')}>
              <span className="qa-icon">🏟️</span>
              <span>Kort & Slotlar</span>
            </button>
          )}
          <button
            className="quick-action-btn"
            onClick={() => navigate('/club/reservation-requests')}
          >
            <span className="qa-icon">📝</span>
            <span>Rezervasyonlar</span>
          </button>
        </div>
      </div>

      {/* Son Kayıt Olan Üyeler */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Son Kayıt Olan Üyeler</h2>
          <button className="btn-link" onClick={() => navigate('/members')}>
            Tümünü Gör →
          </button>
        </div>
        {recentMembers.length === 0 ? (
          <p className="muted">Henüz üye yok.</p>
        ) : (
          <div className="recent-members-list">
            {recentMembers.map((m) => (
              <div key={m.id} className="recent-member-row">
                <div className="member-avatar">
                  {m.firstName[0]}
                  {m.lastName[0]}
                </div>
                <div className="member-info">
                  <span className="member-name">
                    {m.firstName} {m.lastName}
                  </span>
                  <span className="member-email">{m.email}</span>
                </div>
                <div className="member-meta">
                  <span className={`status-badge status-${m.accountStatus}`}>
                    {m.accountStatus === 'active'
                      ? 'Aktif'
                      : m.accountStatus === 'pending_approval'
                        ? 'Bekliyor'
                        : 'Reddedildi'}
                  </span>
                  <span className="member-date">
                    {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bugünün Programı */}
      <div className="dashboard-section">
        <h2 className="section-title">📅 Bugünün Programı</h2>
        {stats.todayBookings.length === 0 ? (
          <p className="muted">Bugün randevu yok.</p>
        ) : (
          <div className="today-bookings-list">
            {stats.todayBookings.map((b) => (
              <div key={b.id} className="today-booking-row">
                <div className="today-booking-time">
                  {new Date(b.time).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="today-booking-info">
                  <span className="today-booking-member">{b.memberName}</span>
                  <span className="today-booking-trainer">→ {b.trainerName}</span>
                </div>
                <span
                  className={`status-badge ${b.status === 'confirmed' ? 'status-active' : 'status-pending_approval'}`}
                >
                  {b.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                  {' · '}
                  {b.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gelir Özeti */}
      <div className="dashboard-section">
        <h2 className="section-title">💰 Bu Ay Gelir Özeti</h2>
        <div className="revenue-cards">
          <div className="revenue-card">
            <span className="revenue-label">Toplam Ciro</span>
            <span className="revenue-value">₺{stats.monthlyRevenue.toLocaleString('tr-TR')}</span>
          </div>
          <div className="revenue-card">
            <span className="revenue-label">Satılan Paket</span>
            <span className="revenue-value">{stats.monthlyPackagesSold}</span>
          </div>
          <div className="revenue-card">
            <span className="revenue-label">Bugün Randevu</span>
            <span className="revenue-value">{stats.todayBookingsCount}</span>
          </div>
        </div>
      </div>

      {/* Aktivite Akışı */}
      {activities.length > 0 && (
        <div className="dashboard-section">
          <h2 className="section-title">🔔 Son Aktiviteler</h2>
          <div className="activity-feed">
            {activities.map((a, i) => (
              <div key={i} className="activity-row">
                <span className="activity-message">{a.message}</span>
                <span className="activity-time">{timeAgo(a.time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
