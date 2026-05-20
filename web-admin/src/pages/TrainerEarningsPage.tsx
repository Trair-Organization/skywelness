import { useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type Revenue = {
  gross: string;
  fee: string;
  net: string;
  count: number;
};

type EarningsData = {
  commissionRate: string;
  commissionPercent: string;
  defaultLessonPrice: string;
  thisMonth: Revenue;
  lastMonth: Revenue;
  thisYear: Revenue;
  monthlyTrend: Array<{ month: string; revenue: string; count: number }>;
  recentLessons: Array<{
    id: string;
    date: string;
    studentName: string;
    gross: string;
    platformFee: string;
    net: string;
    packageId: string | null;
  }>;
};

function formatTRY(amount: string | number) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n);
}

export function TrainerEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    let alive = true;
    apiJson<EarningsData>('/trainer-panel/earnings')
      .then((res) => {
        if (!alive) return;
        setData(res);
        setNewPrice(res.defaultLessonPrice);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Veriler yüklenemedi');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSavePrice() {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    setSavingPrice(true);
    try {
      await apiJson('/trainer-panel/profile', {
        method: 'PATCH',
        body: JSON.stringify({ defaultLessonPrice: price }),
      });
      const refreshed = await apiJson<EarningsData>('/trainer-panel/earnings');
      setData(refreshed);
      setEditingPrice(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setSavingPrice(false);
    }
  }

  if (loading) {
    return (
      <div className="trainer-earnings">
        <p className="muted">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="trainer-earnings">
        <div className="profile-banner profile-banner-error">⚠️ {error}</div>
      </div>
    );
  }

  // Trend chart için max bul
  const maxRevenue = Math.max(
    ...data.monthlyTrend.map((m) => parseFloat(m.revenue)),
    1,
  );

  // Geçen aya göre trend
  const lastMonthNum = parseFloat(data.lastMonth.net);
  const thisMonthNum = parseFloat(data.thisMonth.net);
  const trendDelta = lastMonthNum > 0
    ? ((thisMonthNum - lastMonthNum) / lastMonthNum) * 100
    : 0;
  const isPositive = trendDelta >= 0;

  return (
    <div className="trainer-earnings">
      <div className="earnings-header">
        <div>
          <h1>💰 Kazançlarım</h1>
          <p className="muted">
            Platform komisyonu {data.commissionPercent} · Tamamlanan derslerden hesaplanır
          </p>
        </div>
        <div className="earnings-price-card">
          <span className="earnings-price-label">📦 Ders Ücretim</span>
          {editingPrice ? (
            <div className="earnings-price-edit">
              <input
                type="number"
                className="profile-input"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min={0}
                step={50}
                style={{ width: 120 }}
              />
              <span className="muted">TRY</span>
              <button
                className="btn-sm btn-primary"
                disabled={savingPrice}
                onClick={() => void handleSavePrice()}
              >
                {savingPrice ? '⏳' : '✓'}
              </button>
              <button
                className="btn-sm btn-outline"
                onClick={() => {
                  setNewPrice(data.defaultLessonPrice);
                  setEditingPrice(false);
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="earnings-price-display"
              onClick={() => setEditingPrice(true)}
              title="Düzenlemek için tıkla"
            >
              <strong>{formatTRY(data.defaultLessonPrice)}</strong>
              <span>/ ders</span>
              <span className="earnings-price-edit-icon">✏️</span>
            </button>
          )}
        </div>
      </div>

      {/* Bu ay öne çıkan kart */}
      <section className="earnings-hero">
        <div className="earnings-hero-main">
          <span className="earnings-hero-label">Bu Ay Net Kazanç</span>
          <strong className="earnings-hero-amount">{formatTRY(data.thisMonth.net)}</strong>
          <div className="earnings-hero-meta">
            <span>{data.thisMonth.count} ders tamamlandı</span>
            {lastMonthNum > 0 && (
              <span className={`earnings-trend ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '▲' : '▼'} %{Math.abs(trendDelta).toFixed(1)} (geçen aya göre)
              </span>
            )}
          </div>
        </div>
        <div className="earnings-hero-breakdown">
          <div className="earnings-breakdown-row">
            <span>Brüt gelir</span>
            <strong>{formatTRY(data.thisMonth.gross)}</strong>
          </div>
          <div className="earnings-breakdown-row platform-fee">
            <span>Platform komisyonu ({data.commissionPercent})</span>
            <strong>− {formatTRY(data.thisMonth.fee)}</strong>
          </div>
          <div className="earnings-breakdown-row net">
            <span>Net kazanç</span>
            <strong>{formatTRY(data.thisMonth.net)}</strong>
          </div>
        </div>
      </section>

      {/* Aylık özet kartları */}
      <section className="earnings-stats-row">
        <div className="earnings-stat-card">
          <span className="earnings-stat-label">📅 Geçen Ay</span>
          <strong>{formatTRY(data.lastMonth.net)}</strong>
          <span className="earnings-stat-sub">{data.lastMonth.count} ders</span>
        </div>
        <div className="earnings-stat-card">
          <span className="earnings-stat-label">📊 Bu Yıl</span>
          <strong>{formatTRY(data.thisYear.net)}</strong>
          <span className="earnings-stat-sub">{data.thisYear.count} ders</span>
        </div>
        <div className="earnings-stat-card">
          <span className="earnings-stat-label">💸 Bu Yıl Komisyon</span>
          <strong>{formatTRY(data.thisYear.fee)}</strong>
          <span className="earnings-stat-sub">platforma ödenen</span>
        </div>
      </section>

      {/* Aylık trend */}
      <section className="earnings-card">
        <h2 className="earnings-card-title">📈 Son 6 Ay Trend</h2>
        <div className="earnings-chart">
          {data.monthlyTrend.map((m) => {
            const value = parseFloat(m.revenue);
            const heightPct = (value / maxRevenue) * 100;
            return (
              <div key={m.month} className="earnings-chart-bar">
                <div
                  className="earnings-chart-fill"
                  style={{ height: `${heightPct}%` }}
                  title={`${formatTRY(m.revenue)} (${m.count} ders)`}
                />
                <span className="earnings-chart-value">{formatTRY(m.revenue)}</span>
                <span className="earnings-chart-label">{m.month}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Son dersler tablosu */}
      <section className="earnings-card">
        <h2 className="earnings-card-title">📋 Son Tamamlanan Dersler</h2>
        {data.recentLessons.length === 0 ? (
          <p className="muted">Henüz tamamlanmış ders yok.</p>
        ) : (
          <div className="earnings-table-wrap">
            <table className="earnings-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Öğrenci</th>
                  <th>Brüt</th>
                  <th>Komisyon</th>
                  <th>Net</th>
                  <th>Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLessons.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {new Date(l.date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                      <span className="earnings-table-time">
                        {new Date(l.date).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td>{l.studentName}</td>
                    <td>{formatTRY(l.gross)}</td>
                    <td className="text-fee">− {formatTRY(l.platformFee)}</td>
                    <td className="text-net">
                      <strong>{formatTRY(l.net)}</strong>
                    </td>
                    <td>
                      {l.packageId ? (
                        <span className="earnings-tag earnings-tag-package">📦 Paket</span>
                      ) : (
                        <span className="earnings-tag earnings-tag-direct">💵 Direkt</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
