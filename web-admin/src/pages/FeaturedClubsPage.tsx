import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PublicNav } from '../components/PublicNav';
import { useFavorite } from '../hooks/useFavorite';

type Club = {
  id: string;
  name: string;
  subdomain: string;
  vertical: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  location: string | null;
  description: string | null;
  services: string[];
  avgRating: string | null;
  reviewCount: number | null;
  priceRange: string | null;
  featured: boolean;
};

const VERTICAL_ICONS: Record<string, string> = {
  fitness: '🏋️',
  wellness: '🧖',
  padel: '🎾',
  nutrition: '🥗',
  yoga: '🧘',
  beauty: '💅',
  medical: '⚕️',
};

export function FeaturedClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<Club[]>('/discovery/clubs/featured?limit=50', { auth: false })
      .then(setClubs)
      .catch(() => setClubs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="vitrin-shell">
      <PublicNav active="discover" />
      <main className="vitrin-main" style={{ paddingTop: '2rem' }}>
        <section className="vitrin-section">
          <div className="vitrin-section-header">
            <div>
              <h2>⭐ Öne Çıkan Kulüpler</h2>
              <p>{clubs.length} premium kulüp · platform tarafından doğrulanmış partnerler</p>
            </div>
            <Link to="/discover" className="vitrin-see-all">
              ← Ana sayfaya dön
            </Link>
          </div>

          {loading ? (
            <div className="vitrin-clubs-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="vitrin-skeleton-card">
                  <div className="vitrin-skeleton-cover" />
                  <div className="vitrin-skeleton-body">
                    <div className="vitrin-skeleton-line w-70" />
                    <div className="vitrin-skeleton-line w-50" />
                    <div className="vitrin-skeleton-line w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : clubs.length === 0 ? (
            <div className="vitrin-empty">
              <span className="vitrin-empty-icon">⭐</span>
              <h3>Öne çıkan kulüp yok</h3>
              <p>Yakında premium partnerlerimizi burada göreceksin.</p>
            </div>
          ) : (
            <div className="vitrin-clubs-grid">
              {clubs.map((club) => (
                <FeaturedClubItem key={club.id} club={club} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function FeaturedClubItem({ club }: { club: Club }) {
  const { isFavorite, toggle, isLoggedIn } = useFavorite('club', club.id);

  return (
    <div className="vitrin-club-card-wrapper">
      {isLoggedIn && (
        <button
          className={`vitrin-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggle();
          }}
          aria-label={isFavorite ? 'Favorilerden kaldır' : 'Favorilere ekle'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      )}
      <Link to={`/club/${club.subdomain}`} className="vitrin-club-card">
        <div className="vitrin-club-cover">
          {club.coverImageUrl || club.logoUrl ? (
            <img src={club.coverImageUrl || club.logoUrl || ''} alt={club.name} />
          ) : (
            <div className="vitrin-club-ph">{club.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div className="vitrin-club-badges">
            <span className="vitrin-badge premium">⭐ Premium</span>
            <span className="vitrin-badge verified">✓ Doğrulanmış</span>
          </div>
          {club.vertical && (
            <span className="vitrin-club-vertical">
              {VERTICAL_ICONS[club.vertical] || '🏢'}
            </span>
          )}
        </div>
        <div className="vitrin-club-body">
          <h3>{club.name}</h3>
          {club.location && <p className="vitrin-card-location">📍 {club.location}</p>}
          <div className="vitrin-card-meta">
            {club.avgRating && Number(club.avgRating) > 0 && (
              <span className="vitrin-card-rating">★ {Number(club.avgRating).toFixed(1)}</span>
            )}
            {club.reviewCount ? (
              <span className="vitrin-card-reviews">({club.reviewCount} değerlendirme)</span>
            ) : null}
          </div>
          {club.services.length > 0 && (
            <div className="vitrin-card-tags">
              {club.services.slice(0, 3).map((s) => (
                <span key={s} className="vitrin-card-tag">
                  {s}
                </span>
              ))}
            </div>
          )}
          {club.priceRange && <p className="vitrin-card-price-range">{club.priceRange}</p>}
        </div>
      </Link>
    </div>
  );
}
