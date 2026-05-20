import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PublicNav } from '../components/PublicNav';

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  discountKind: string;
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  endsAt: string;
  campaignType: string;
  tenantName?: string;
  clubSubdomain: string | null;
};

export function AllCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    apiJson<Campaign[]>('/campaigns/public?limit=100', { auth: false })
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  function timeLeft(endsAt: string): string {
    const end = new Date(endsAt).getTime();
    const diff = end - now.getTime();
    if (diff <= 0) return 'Süresi doldu';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    if (days > 0) return `${days}g ${hours}s kaldı`;
    return `${hours}s kaldı`;
  }

  return (
    <div className="vitrin-shell">
      <PublicNav active="discover" />
      <main className="vitrin-main" style={{ paddingTop: '2rem' }}>
        <section className="vitrin-section">
          <div className="vitrin-section-header">
            <div>
              <h2>🔥 Tüm Aktif Kampanyalar</h2>
              <p>{campaigns.length} kampanya · özel fırsatlar sınırlı süreyle geçerli</p>
            </div>
            <Link to="/discover" className="vitrin-see-all">
              ← Ana sayfaya dön
            </Link>
          </div>

          {loading ? (
            <div className="vitrin-loading">
              <div className="vitrin-spinner" />
              <p>Yükleniyor...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="vitrin-empty">
              <span className="vitrin-empty-icon">🎁</span>
              <h3>Aktif kampanya yok</h3>
              <p>Şu an aktif kampanya bulunmuyor. Yakında geri gelin.</p>
            </div>
          ) : (
            <div className="vitrin-campaigns-grid vitrin-grid-full">
              {campaigns.map((c) => {
                const discountLabel =
                  c.discountKind === 'percentage' ? `%${c.discountValue}` : `${c.discountValue}₺`;
                return (
                  <Link
                    key={c.id}
                    to={`/campaign/${c.id}`}
                    className="vitrin-campaign-card"
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    {c.imageUrl && (
                      <img src={c.imageUrl} alt={c.title} className="vitrin-campaign-img" />
                    )}
                    <div className="vitrin-campaign-body">
                      <div className="vitrin-campaign-header">
                        <h3>{c.title}</h3>
                        <span className="vitrin-campaign-badge">{discountLabel}</span>
                      </div>
                      {c.description && (
                        <p className="vitrin-campaign-desc">
                          {c.description.slice(0, 100)}
                          {c.description.length > 100 ? '...' : ''}
                        </p>
                      )}
                      <div className="vitrin-campaign-footer">
                        {c.tenantName && <span className="vitrin-campaign-club">{c.tenantName}</span>}
                        <span className="vitrin-campaign-time">⏱ {timeLeft(c.endsAt)}</span>
                      </div>
                      {c.originalPrice && c.discountedPrice && (
                        <div className="vitrin-campaign-prices">
                          <span className="vitrin-price-old">{c.originalPrice}₺</span>
                          <span className="vitrin-price-new">{c.discountedPrice}₺</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
