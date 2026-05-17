import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { readStoredTenantSubdomain } from '../auth/storage';

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

export function ClubDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubInviteCode, setClubInviteCode] = useState('');
  const [weeklyStats, setWeeklyStats] = useState<Array<{ label: string; revenue: number; newMembers: number }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, members, weekly] = await Promise.all([
        apiJson<DashboardStats>('/admin/stats'),
        apiJson<RecentMember[]>('/admin/members?status=all'),
        apiJson<Array<{ label: string; revenue: number; newMembers: number }>>('/admin/weekly-stats'),
      ]);
      setStats(s);
      setRecentMembers(members.slice(0, 5));
      setWeeklyStats(weekly);
    } catch {
      /* ignore */
    }
    try {
      const codeRes = await apiJson<{ inviteCode: string }>('/admin/club-invite-code');
      setClubInviteCode(codeRes.inviteCode);
    } catch {
      /* ignore */
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
      <div style={{ padding: '2rem' }}>
        <p style={{ color: '#64748b' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header + Kulüp Kodu */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{isWellness ? 'Skyland Wellness' : 'Dashboard'}</h1>
          <p style={styles.subtitle}>Yönetim Paneli</p>
        </div>
        <div style={styles.clubCodeBox}>
          <span style={styles.clubCodeLabel}>Kulüp Kodu</span>
          <span style={styles.clubCodeValue}>{clubInviteCode || '...'}</span>
          <button
            style={styles.copyBtn}
            onClick={() => {
              if (clubInviteCode) {
                navigator.clipboard.writeText(clubInviteCode);
                alert('Kod kopyalandı!');
              }
            }}
          >
            Kopyala
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div style={styles.statsGrid}>
        <StatCard
          icon="👥"
          value={stats.totalMembers}
          label="Toplam Üye"
          badge={`${stats.activeMembers} aktif`}
          badgeColor="#2563eb"
          onClick={() => navigate('/members')}
        />
        <StatCard
          icon="⏳"
          value={stats.pendingMembers}
          label="Onay Bekleyen"
          badge={stats.pendingMembers > 0 ? 'Aksiyon gerekli' : undefined}
          badgeColor="#d97706"
          onClick={() => navigate('/members?status=pending_approval')}
        />
        <StatCard icon="📈" value={stats.newMembersThisMonth} label="Bu Ay Yeni Üye" />
        <StatCard
          icon="📅"
          value={stats.todayBookingsCount}
          label="Bugün Randevu"
          badge={`${stats.upcomingEvents} etkinlik`}
          badgeColor="#059669"
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          icon="💰"
          value={`₺${stats.monthlyRevenue.toLocaleString('tr-TR')}`}
          label="Bu Ay Ciro"
        />
        <StatCard
          icon="📦"
          value={stats.monthlyPackagesSold}
          label="Satılan Paket"
          onClick={() => navigate('/packages')}
        />
      </div>

      {/* Haftalık İstatistikler */}
      {weeklyStats.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📊 Haftalık Trend (Son 4 Hafta)</h2>
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            {/* Gelir Grafiği */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>💰 Gelir (₺)</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                {weeklyStats.map((w, i) => {
                  const max = Math.max(...weeklyStats.map(x => x.revenue), 1);
                  const pct = (w.revenue / max) * 100;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div style={{ height: `${pct}%`, minHeight: 4, background: '#2563eb', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>{w.label}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a' }}>₺{w.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Yeni Üye Grafiği */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>👥 Yeni Üye</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                {weeklyStats.map((w, i) => {
                  const max = Math.max(...weeklyStats.map(x => x.newMembers), 1);
                  const pct = (w.newMembers / max) * 100;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div style={{ height: `${pct}%`, minHeight: 4, background: '#059669', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' }} />
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 4 }}>{w.label}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a' }}>{w.newMembers}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bugünün Programı */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Bugünün Programı</h2>
        {stats.todayBookings.length === 0 ? (
          <p style={styles.emptyText}>Bugün randevu yok.</p>
        ) : (
          <div style={styles.bookingsList}>
            {stats.todayBookings.map((b) => (
              <div key={b.id} style={styles.bookingRow}>
                <span style={styles.bookingTime}>
                  {new Date(b.time).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span style={styles.bookingMember}>{b.memberName || '—'}</span>
                <span style={styles.bookingTrainer}>{b.trainerName || '—'}</span>
                <span
                  style={{
                    ...styles.bookingBadge,
                    background: b.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                    color: b.status === 'confirmed' ? '#166534' : '#92400e',
                  }}
                >
                  {b.sessionType === 'personal_training' ? 'PT' : 'Masaj'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Son Üyeler */}
      <div style={styles.section}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={styles.sectionTitle}>Son Kayıt Olan Üyeler</h2>
          <button style={styles.linkBtn} onClick={() => navigate('/members')}>
            Tümünü Gör →
          </button>
        </div>
        {recentMembers.length === 0 ? (
          <p style={styles.emptyText}>Henüz üye yok.</p>
        ) : (
          <div style={styles.membersList}>
            {recentMembers.map((m) => (
              <div key={m.id} style={styles.memberRow}>
                <div style={styles.memberAvatar}>
                  {m.firstName[0]}
                  {m.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.memberName}>
                    {m.firstName} {m.lastName}
                  </div>
                  <div style={styles.memberEmail}>{m.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: m.accountStatus === 'active' ? '#dcfce7' : '#fef3c7',
                      color: m.accountStatus === 'active' ? '#166534' : '#92400e',
                    }}
                  >
                    {m.accountStatus === 'active' ? 'Aktif' : 'Bekliyor'}
                  </span>
                  <div style={styles.memberDate}>
                    {new Date(m.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── StatCard Component ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  badge,
  badgeColor,
  onClick,
}: {
  icon: string;
  value: string | number;
  label: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}) {
  return (
    <div style={{ ...styles.statCard, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
      {badge && <div style={{ ...styles.statBadge, color: badgeColor || '#2563eb' }}>{badge}</div>}
    </div>
  );
}

// ─── Inline Styles ──────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: 0,
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '0.9rem',
    color: '#64748b',
  },
  clubCodeBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    background: '#f1f5f9',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
  },
  clubCodeLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#64748b',
  },
  clubCodeValue: {
    fontSize: '1.1rem',
    fontWeight: 800,
    letterSpacing: 2,
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '20px 18px',
    transition: 'all 0.15s',
    position: 'relative' as const,
  },
  statIcon: {
    fontSize: '1.5rem',
    marginBottom: 8,
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: 4,
  },
  statBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  // Section
  section: {
    marginBottom: 28,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '20px 24px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0,
    color: '#0f172a',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    margin: '12px 0 0',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    padding: 0,
  },
  // Bookings
  bookingsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    marginTop: 12,
  },
  bookingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  bookingTime: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#0f172a',
    minWidth: 50,
  },
  bookingMember: {
    flex: 1,
    fontSize: '0.85rem',
    color: '#374151',
    fontWeight: 500,
  },
  bookingTrainer: {
    fontSize: '0.85rem',
    color: '#64748b',
  },
  bookingBadge: {
    padding: '3px 10px',
    borderRadius: 8,
    fontSize: '0.72rem',
    fontWeight: 700,
  },
  // Members
  membersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 12,
    color: '#2563eb',
    flexShrink: 0,
  },
  memberName: {
    fontWeight: 600,
    fontSize: '0.9rem',
    color: '#0f172a',
  },
  memberEmail: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 8,
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  memberDate: {
    fontSize: '0.72rem',
    color: '#94a3b8',
    marginTop: 4,
  },
};
