import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type CampaignDetail = {
  id: string;
  title: string;
  description: string | null;
  discountKind: string;
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  imageUrl: string | null;
  endsAt: string;
  startsAt: string | null;
  terms: string | null;
  tenant?: { name: string; subdomain: string; logoUrl: string | null };
};

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { token, user } = useAuth();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    try {
      const data = await apiJson<CampaignDetail>(`/campaigns/${campaignId}/detail`, {
        auth: false,
      });
      setCampaign(data);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function handleBuy() {
    if (!token || !campaign) return;
    setBuying(true);
    try {
      const res = await apiJson<{ checkoutUrl: string }>(`/v2/campaigns/${campaign.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ userId: user?.id, guestEmail: user?.email }),
      });
      if (res.checkoutUrl) {
        const overlay = document.createElement('div');
        overlay.className = 'checkout-loading-overlay';
        overlay.innerHTML =
          '<div class="checkout-spinner"></div><p>Ödeme ekranına yönlendiriliyorsunuz...</p>';
        document.body.appendChild(overlay);
        setTimeout(() => window.location.assign(res.checkoutUrl), 800);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ödeme başlatılamadı');
    } finally {
      setBuying(false);
    }
  }

  if (loading)
    return (
      <div className="public-shell">
        <div className="profile-loading">Yükleniyor...</div>
      </div>
    );
  if (!campaign)
    return (
      <div className="public-shell">
        <div className="profile-loading">Kampanya bulunamadı</div>
      </div>
    );

  const discount =
    campaign.discountKind === 'percentage'
      ? `%${campaign.discountValue} İndirim`
      : `₺${campaign.discountValue} İndirim`;
  const price = campaign.discountedPrice || campaign.originalPrice;
  const hasPrice = price && parseFloat(price) > 0;

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
          <Link to="/login" className="public-nav-login">
            Giriş Yap
          </Link>
        </div>
      </nav>

      <div className="event-detail-page">
        {/* Hero */}
        {campaign.imageUrl && (
          <div className="event-detail-hero">
            <img src={campaign.imageUrl} alt={campaign.title} />
          </div>
        )}

        <div className="event-detail-content">
          {/* Header */}
          <div className="event-detail-header">
            <h1>{campaign.title}</h1>
            <span
              className="event-category-badge"
              style={{
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                borderColor: 'rgba(16,185,129,0.3)',
              }}
            >
              {discount}
            </span>
          </div>

          {/* Info Grid */}
          <div className="event-info-grid">
            {campaign.originalPrice && (
              <div className="event-info-item">
                <span className="event-info-icon">💰</span>
                <div>
                  <strong>Orijinal Fiyat</strong>
                  <p style={{ textDecoration: 'line-through', color: '#64748b' }}>
                    ₺{parseFloat(campaign.originalPrice).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            )}
            {campaign.discountedPrice && (
              <div className="event-info-item">
                <span className="event-info-icon">🎉</span>
                <div>
                  <strong>İndirimli Fiyat</strong>
                  <p style={{ color: '#10b981', fontWeight: 800, fontSize: '1.2rem' }}>
                    ₺{parseFloat(campaign.discountedPrice).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            )}
            <div className="event-info-item">
              <span className="event-info-icon">⏰</span>
              <div>
                <strong>Son Tarih</strong>
                <p>
                  {new Date(campaign.endsAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {campaign.tenant && (
              <div className="event-info-item">
                <span className="event-info-icon">🏢</span>
                <div>
                  <strong>Kulüp</strong>
                  <p>
                    <Link to={`/club/${campaign.tenant.subdomain}`}>{campaign.tenant.name}</Link>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {campaign.description && (
            <div className="event-detail-section">
              <h2>Kampanya Detayları</h2>
              <p>{campaign.description}</p>
            </div>
          )}

          {/* Conditions */}
          {campaign.terms && (
            <div className="event-detail-section">
              <h2>Şartlar ve Koşullar</h2>
              <p>{campaign.terms}</p>
            </div>
          )}

          {/* CTA */}
          <div className="event-detail-cta">
            {hasPrice && token ? (
              <button className="btn-primary event-join-btn" onClick={handleBuy} disabled={buying}>
                {buying
                  ? 'Yönlendiriliyor...'
                  : `💳 Fırsatı Yakala — ₺${parseFloat(price!).toLocaleString('tr-TR')}`}
              </button>
            ) : hasPrice && !token ? (
              <div className="login-required-box">
                <p>Bu fırsattan yararlanmak için giriş yapın.</p>
                <div className="login-required-actions">
                  <Link to="/register" className="btn-primary">
                    Üye Ol
                  </Link>
                  <Link to="/login" className="btn-outline">
                    Giriş Yap
                  </Link>
                </div>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center' }}>
                Bu kampanya için online ödeme bulunmamaktadır. Detaylar için kulüple iletişime
                geçin.
              </p>
            )}
          </div>

          <Link to="/discover" className="event-back-link">
            ← Kampanyalara Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
