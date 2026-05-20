import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiJson } from '../lib/api';

type DashboardData = {
  todayLessons: number;
  weeklyLessons: number;
  monthlyCompleted: number;
  monthlyCancelled: number;
  activeStudents: number;
  pendingRequests: number;
  unreadMessages: number;
  nextLesson: { time: string; studentName: string } | null;
  todaySchedule: Array<{
    id: string;
    time: string;
    endTime: string;
    studentName: string;
    type: string;
    status: string;
  }>;
};

export function TrainerDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const fetchData = (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      apiJson<DashboardData>('/trainer-panel/dashboard')
        .then((res) => {
          if (!alive) return;
          setData(res);
        })
        .catch((err) => {
          if (!alive) return;
          setError(err instanceof Error ? err.message : 'Veriler yüklenemedi');
        })
        .finally(() => {
          if (alive && showLoading) setLoading(false);
        });
    };
    fetchData(true);
    // Mesaj/talep sayacı için 30sn'de bir sessiz refresh
    const id = setInterval(() => fetchData(false), 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'İyi geceler';
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi günler';
    return 'İyi akşamlar';
  })();

  const nextLessonTime = data?.nextLesson
    ? new Date(data.nextLesson.time).toLocaleString('tr-TR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="trainer-panel">
      {/* Hero Header */}
      <header className="trainer-hero">
        <div className="trainer-hero-content">
          <div className="trainer-hero-greeting">
            <span className="trainer-hero-emoji">👋</span>
            <div>
              <p className="trainer-hero-label">{greeting},</p>
              <h1 className="trainer-hero-name">
                {user?.firstName} {user?.lastName}
              </h1>
            </div>
          </div>
          <p className="trainer-hero-sub">Bugün seni neler bekliyor — bir bakalım.</p>
        </div>
        {data?.nextLesson && (
          <div className="trainer-hero-next">
            <span className="trainer-hero-next-label">⏭️ Sıradaki Ders</span>
            <strong>{data.nextLesson.studentName}</strong>
            <span className="trainer-hero-next-time">{nextLessonTime}</span>
          </div>
        )}
      </header>

      {error && <div className="trainer-error-banner">⚠️ {error}</div>}

      {/* Stats Grid */}
      <section className="trainer-stats-grid">
        <StatCard
          icon="📅"
          label="Bugün"
          value={loading ? '—' : (data?.todayLessons ?? 0)}
          sub="ders programlı"
          accent="blue"
          to="/trainer/students"
        />
        <StatCard
          icon="📊"
          label="Bu Hafta"
          value={loading ? '—' : (data?.weeklyLessons ?? 0)}
          sub="planlanan"
          accent="purple"
        />
        <StatCard
          icon="✅"
          label="Bu Ay"
          value={loading ? '—' : (data?.monthlyCompleted ?? 0)}
          sub="tamamlanan"
          accent="green"
        />
        <StatCard
          icon="❌"
          label="Bu Ay"
          value={loading ? '—' : (data?.monthlyCancelled ?? 0)}
          sub="iptal edilen"
          accent="red"
        />
        <StatCard
          icon="👥"
          label="Aktif"
          value={loading ? '—' : (data?.activeStudents ?? 0)}
          sub="öğrenci"
          accent="teal"
          to="/trainer/students"
        />
        <StatCard
          icon="⏳"
          label="Bekleyen"
          value={loading ? '—' : (data?.pendingRequests ?? 0)}
          sub="randevu talebi"
          accent="orange"
        />
        <StatCard
          icon="💬"
          label="Okunmamış"
          value={loading ? '—' : (data?.unreadMessages ?? 0)}
          sub="mesaj"
          accent="pink"
          to="/trainer/messages"
        />
      </section>

      <div className="trainer-grid-2col">
        {/* Today's Schedule */}
        <section className="trainer-card">
          <div className="trainer-card-header">
            <h2>📋 Bugünün Programı</h2>
            <Link to="/trainer/students" className="trainer-card-link">
              Tüm dersler →
            </Link>
          </div>
          {loading ? (
            <div className="trainer-card-loading">Yükleniyor...</div>
          ) : !data?.todaySchedule || data.todaySchedule.length === 0 ? (
            <div className="trainer-card-empty">
              <span className="trainer-empty-icon">☕</span>
              <p>Bugün boş — dinlenmenin tadını çıkar.</p>
            </div>
          ) : (
            <ul className="trainer-schedule-list">
              {data.todaySchedule.map((s) => {
                const start = new Date(s.time);
                const end = new Date(s.endTime);
                return (
                  <li key={s.id} className={`trainer-schedule-item status-${s.status}`}>
                    <div className="trainer-schedule-time">
                      <strong>
                        {start.toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                      <span>
                        {end.toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="trainer-schedule-info">
                      <strong>{s.studentName}</strong>
                      <span className="trainer-schedule-type">
                        {s.type === 'personal_training' ? '🏋️ PT' : `📌 ${s.type}`}
                      </span>
                    </div>
                    <span className={`trainer-status-badge status-${s.status}`}>
                      {s.status === 'confirmed'
                        ? 'Onaylı'
                        : s.status === 'pending'
                          ? 'Bekliyor'
                          : s.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Quick Actions */}
        <section className="trainer-card">
          <div className="trainer-card-header">
            <h2>⚡ Hızlı Eylemler</h2>
          </div>
          <div className="trainer-quick-actions">
            <Link to="/trainer/students" className="trainer-quick-action">
              <span className="qa-icon">👥</span>
              <div>
                <strong>Öğrencilerim</strong>
                <p>Aktif öğrenci listesi & paketler</p>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
            <Link to="/trainer/services" className="trainer-quick-action">
              <span className="qa-icon">📦</span>
              <div>
                <strong>Hizmet & Paket</strong>
                <p>PT paketleri ve ücretler</p>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
            <Link to="/trainer/events" className="trainer-quick-action">
              <span className="qa-icon">📅</span>
              <div>
                <strong>Etkinlikler</strong>
                <p>Grup dersleri ve etkinlik oluştur</p>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
            <Link to="/trainer/profile" className="trainer-quick-action">
              <span className="qa-icon">🏋️</span>
              <div>
                <strong>Profilim</strong>
                <p>Bio, fotoğraf, sertifikalar</p>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
            <Link to="/trainer/messages" className="trainer-quick-action">
              <span className="qa-icon">💬</span>
              <div>
                <strong>Mesajlar</strong>
                <p>Öğrenciler ile iletişim</p>
                {data && data.unreadMessages > 0 && (
                  <span className="qa-badge">{data.unreadMessages}</span>
                )}
              </div>
              <span className="qa-arrow">→</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  to,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub: string;
  accent: 'blue' | 'purple' | 'green' | 'red' | 'teal' | 'orange' | 'pink';
  to?: string;
}) {
  const Inner = (
    <>
      <span className="trainer-stat-icon">{icon}</span>
      <div className="trainer-stat-body">
        <span className="trainer-stat-label">{label}</span>
        <strong className="trainer-stat-value">{value}</strong>
        <span className="trainer-stat-sub">{sub}</span>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`trainer-stat-card accent-${accent}`}>
        {Inner}
      </Link>
    );
  }
  return <div className={`trainer-stat-card accent-${accent}`}>{Inner}</div>;
}
