import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  totalTrainers: number;
  totalEvents: number;
  upcomingEvents: number;
  newMembersThisMonth: number;
  todayBookingsCount: number;
  monthlyRevenue: number;
  monthlyPackagesSold: number;
};

type WeeklyData = { label: string; revenue: number; newMembers: number };

export function ClubInsightsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.all([
        apiJson<DashboardStats>('/admin/stats'),
        apiJson<WeeklyData[]>('/admin/weekly-stats'),
      ]);
      setStats(s);
      setWeekly(w);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading || !stats) return <div style={{ padding: '2rem' }}><p style={{ color: '#64748b' }}>Yükleniyor...</p></div>;

  const totalRevenue = weekly.reduce((s, w) => s + w.revenue, 0);
  const totalNewMembers = weekly.reduce((s, w) => s + w.newMembers, 0);
  const avgRevenuePerWeek = weekly.length > 0 ? Math.round(totalRevenue / weekly.length) : 0;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>📈 İstatistikler</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Kulüp performans özeti</p>
        </div>
        <button onClick={() => void load()} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>🔄 Yenile</button>
      </div>

      {/* Ana Metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard icon="👥" value={stats.totalMembers} label="Toplam Üye" sub={`${stats.activeMembers} aktif`} color="#2563eb" />
        <StatCard icon="📈" value={stats.newMembersThisMonth} label="Bu Ay Yeni" sub={`${totalNewMembers} son 4 hafta`} color="#059669" />
        <StatCard icon="💰" value={`₺${stats.monthlyRevenue.toLocaleString('tr-TR')}`} label="Bu Ay Ciro" sub={`Ort: ₺${avgRevenuePerWeek.toLocaleString('tr-TR')}/hafta`} color="#d97706" />
        <StatCard icon="📦" value={stats.monthlyPackagesSold} label="Satılan Paket" color="#7c3aed" />
        <StatCard icon="📅" value={stats.todayBookingsCount} label="Bugün Randevu" sub={`${stats.upcomingEvents} etkinlik`} color="#0891b2" />
        <StatCard icon="🏋️" value={stats.totalTrainers} label="Eğitmen" color="#dc2626" />
      </div>

      {/* Haftalık Trend Grafikleri */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Gelir Grafiği */}
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>💰 Haftalık Gelir</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 100 }}>
            {weekly.map((w, i) => {
              const max = Math.max(...weekly.map(x => x.revenue), 1);
              const pct = (w.revenue / max) * 100;
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ height: `${pct}%`, minHeight: 4, background: '#2563eb', borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{w.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>₺{w.revenue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Üye Büyüme Grafiği */}
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>👥 Yeni Üye Trendi</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 100 }}>
            {weekly.map((w, i) => {
              const max = Math.max(...weekly.map(x => x.newMembers), 1);
              const pct = (w.newMembers / max) * 100;
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{ height: `${pct}%`, minHeight: 4, background: '#059669', borderRadius: '4px 4px 0 0' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{w.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{w.newMembers}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alt Metrikler */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Üye Dağılımı */}
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>👥 Üye Durumu</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MetricRow label="Aktif" value={stats.activeMembers} total={stats.totalMembers} color="#059669" />
            <MetricRow label="Bekleyen" value={stats.pendingMembers} total={stats.totalMembers} color="#d97706" />
            <MetricRow label="Diğer" value={stats.totalMembers - stats.activeMembers - stats.pendingMembers} total={stats.totalMembers} color="#94a3b8" />
          </div>
        </div>

        {/* Etkinlik Durumu */}
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>📅 Etkinlikler</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Toplam</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{stats.totalEvents}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Yaklaşan</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{stats.upcomingEvents}</span>
            </div>
          </div>
        </div>

        {/* Gelir Özeti */}
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>💰 Gelir Özeti</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Bu Ay</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>₺{stats.monthlyRevenue.toLocaleString('tr-TR')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Son 4 Hafta</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>₺{totalRevenue.toLocaleString('tr-TR')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Paket Satışı</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed' }}>{stats.monthlyPackagesSold} adet</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function StatCard({ icon, value, label, sub, color }: { icon: string; value: string | number; label: string; sub?: string; color: string }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
      <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MetricRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{value} (%{pct})</span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}
