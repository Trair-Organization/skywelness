import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';
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
  city: string | null;
  district: string | null;
  description: string | null;
  services: string[];
  avgRating: string | null;
  reviewCount: number | null;
  priceRange: string | null;
  featured: boolean;
};

const VERTICALS = [
  { key: '', label: 'Tümü', icon: '🏠' },
  { key: 'fitness', label: 'Fitness', icon: '🏋️' },
  { key: 'wellness', label: 'Wellness & Spa', icon: '🧖' },
  { key: 'padel', label: 'Padel & Tenis', icon: '🎾' },
  { key: 'nutrition', label: 'Beslenme & Diyet', icon: '🥗' },
  { key: 'yoga', label: 'Yoga & Pilates', icon: '🧘' },
  { key: 'beauty', label: 'Güzellik', icon: '💅' },
  { key: 'medical', label: 'Medikal', icon: '⚕️' },
];

const SORT_OPTIONS = [
  { key: '', label: 'Önerilen' },
  { key: 'rating', label: 'En Yüksek Puan' },
  { key: 'newest', label: 'En Yeni' },
  { key: 'popular', label: 'En Popüler' },
];

export function AllClubsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const searchQuery = searchParams.get('q') || '';
  const cityFilter = searchParams.get('city') || '';
  const districtFilter = searchParams.get('district') || '';
  const verticalFilter = searchParams.get('vertical') || '';
  const sortBy = searchParams.get('sort') || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (searchQuery) params.set('search', searchQuery);
      if (cityFilter) params.set('city', cityFilter);
      if (districtFilter) params.set('district', districtFilter);
      if (verticalFilter) params.set('vertical', verticalFilter);
      if (sortBy) params.set('sort', sortBy);

      const data = await apiJson<Club[]>(`/discovery/clubs?${params}`, { auth: false });
      setClubs(data);
    } catch {
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter, districtFilter, verticalFilter, sortBy]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'city') next.delete('district');
    setSearchParams(next, { replace: true });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter('q', searchInput.trim());
  }

  const hasActiveFilters = !!(searchQuery || cityFilter || verticalFilter || sortBy);

  return (
    <div className="vitrin-shell">
      <PublicNav active="discover" />

      <main className="vitrin-main" style={{ paddingTop: '2rem' }}>
        {/* Category Tabs */}
        <div className="vitrin-categories" style={{ marginTop: 0 }}>
          <div className="vitrin-categories-scroll">
            {VERTICALS.map((v) => (
              <button
                key={v.key}
                className={`vitrin-category-tab ${verticalFilter === v.key ? 'active' : ''}`}
                onClick={() => updateFilter('vertical', v.key)}
              >
                <span className="vitrin-cat-icon">{v.icon}</span>
                <span className="vitrin-cat-label">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters Row */}
        <div className="vitrin-filters">
          <div className="vitrin-filters-left">
            <select
              value={cityFilter}
              onChange={(e) => updateFilter('city', e.target.value)}
              className="vitrin-filter-select"
            >
              <option value="">📍 Tüm İller</option>
              {CITY_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {cityFilter && (
              <select
                value={districtFilter}
                onChange={(e) => updateFilter('district', e.target.value)}
                className="vitrin-filter-select"
              >
                <option value="">Tüm İlçeler</option>
                {getDistricts(cityFilter).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            <select
              value={sortBy}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="vitrin-filter-select"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <form className="vitrin-search-bar" onSubmit={handleSearch}>
              <span className="vitrin-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Kulüp, hizmet veya lokasyon ara..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="vitrin-search-input"
              />
              {searchInput && (
                <button
                  type="button"
                  className="vitrin-search-clear"
                  onClick={() => {
                    setSearchInput('');
                    updateFilter('q', '');
                  }}
                >
                  ✕
                </button>
              )}
              <button type="submit" className="vitrin-search-btn">
                Ara
              </button>
            </form>
          </div>
          {hasActiveFilters && (
            <button
              className="vitrin-filter-clear"
              onClick={() => setSearchParams({}, { replace: true })}
            >
              ✕ Filtreleri Temizle
            </button>
          )}
        </div>

        <section className="vitrin-section">
          <div className="vitrin-section-header">
            <div>
              <h2>
                🏢{' '}
                {verticalFilter
                  ? VERTICALS.find((v) => v.key === verticalFilter)?.label
                  : 'Tüm Kulüpler'}
              </h2>
              <p>{clubs.length} kulüp bulundu</p>
            </div>
            <Link to="/discover" className="vitrin-see-all">
              ← Ana sayfaya dön
            </Link>
          </div>

          {loading ? (
            <div className="vitrin-clubs-grid vitrin-grid-full">
              {Array.from({ length: 8 }).map((_, i) => (
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
              <span className="vitrin-empty-icon">🔍</span>
              <h3>Sonuç bulunamadı</h3>
              <p>Farklı filtreler deneyerek tekrar arayın.</p>
            </div>
          ) : (
            <div className="vitrin-clubs-grid vitrin-grid-full">
              {clubs.map((club) => (
                <ClubCardItem key={club.id} club={club} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ClubCardItem({ club }: { club: Club }) {
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
            {club.featured && <span className="vitrin-badge premium">⭐ Premium</span>}
            <span className="vitrin-badge verified">✓ Doğrulanmış</span>
          </div>
          {club.vertical && (
            <span className="vitrin-club-vertical">
              {VERTICALS.find((v) => v.key === club.vertical)?.icon || '🏢'}
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
