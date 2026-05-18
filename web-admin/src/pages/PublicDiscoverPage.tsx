import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';

const ClubMap = lazy(() => import('../components/ClubMap').then((m) => ({ default: m.ClubMap })));

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
  latitude: string | null;
  longitude: string | null;
};
type Trainer = {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  specialties: string[];
  avgRating: string;
  totalSessions: number;
  clubName: string;
  clubSubdomain: string;
  city: string | null;
};
type Event = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  category: string;
  price: string;
  currency: string;
  clubName: string | null;
  clubSubdomain: string | null;
};
type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  buttonText: string | null;
};
type Campaign = {
  id: string;
  title: string;
  description: string | null;
  discountKind: string;
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  imageUrl: string | null;
  endsAt: string;
  tenant?: { name: string; subdomain: string };
};

const VERTICALS = [
  { key: '', label: 'Tümü', icon: '🏠' },
  { key: 'fitness', label: 'Fitness', icon: '🏋️' },
  { key: 'wellness', label: 'Wellness & Spa', icon: '🧖' },
  { key: 'padel', label: 'Padel & Tenis', icon: '🎾' },
  { key: 'yoga', label: 'Yoga & Pilates', icon: '🧘' },
  { key: 'beauty', label: 'Güzellik', icon: '💅' },
  { key: 'medical', label: 'Medikal', icon: '⚕️' },
];

const SORT_OPTIONS = [
  { key: '', label: 'Önerilen' },
  { key: 'rating', label: 'En Yüksek Puan' },
  { key: 'newest', label: 'En Yeni' },
  { key: 'name', label: 'İsim (A-Z)' },
];

export function PublicDiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filters from URL
  const searchQuery = searchParams.get('q') || '';
  const cityFilter = searchParams.get('city') || '';
  const districtFilter = searchParams.get('district') || '';
  const verticalFilter = searchParams.get('vertical') || '';
  const sortBy = searchParams.get('sort') || '';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [now] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const updateFilter = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key === 'city') p.delete('district');
    setSearchParams(p, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (searchQuery) params.set('search', searchQuery);
      if (cityFilter) params.set('city', cityFilter);
      if (districtFilter) params.set('district', districtFilter);
      if (verticalFilter) params.set('vertical', verticalFilter);
      if (sortBy) params.set('sort', sortBy);

      const [c, t, e, b, camp] = await Promise.all([
        apiJson<Club[]>(`/discovery/clubs?${params.toString()}`, { auth: false }),
        apiJson<Trainer[]>(
          `/discovery/trainers?limit=12${cityFilter ? `&city=${encodeURIComponent(cityFilter)}` : ''}`,
          { auth: false },
        ),
        apiJson<Event[]>('/discovery/events?limit=8', { auth: false }),
        apiJson<Banner[]>('/home-banners', { auth: false }),
        apiJson<Campaign[]>('/campaigns/featured?limit=8', { auth: false }),
      ]);
      setClubs(c);
      setTrainers(t);
      setEvents(e);
      setBanners(b);
      setCampaigns(camp);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [searchQuery, cityFilter, districtFilter, verticalFilter, sortBy]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  // Auto-slide
  useEffect(() => {
    if (banners.length <= 1) return;
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current);
    };
  }, [banners.length]);

  function goToSlide(idx: number) {
    setCurrentSlide(idx);
    if (slideInterval.current) clearInterval(slideInterval.current);
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateFilter('q', searchInput.trim());
  }

  const hasActiveFilters = searchQuery || cityFilter || verticalFilter || sortBy;

  return (
    <div className="vitrin-shell">
      {/* Navigation */}
      <nav className="vitrin-nav">
        <Link to="/" className="vitrin-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="vitrin-nav-links">
          <Link to="/discover" className="vitrin-nav-link active">
            Keşfet
          </Link>
          <Link to="/partner-register" className="vitrin-nav-link">
            Partner Ol
          </Link>
          <Link to="/register" className="vitrin-nav-link">
            Üye Ol
          </Link>
          <Link to="/login" className="vitrin-nav-login">
            Giriş Yap
          </Link>
        </div>
      </nav>

      {/* Hero Slider */}
      {banners.length > 0 ? (
        <section className="vitrin-hero-slider">
          <div className="vitrin-slider-track">
            {banners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`vitrin-slide ${idx === currentSlide ? 'vitrin-slide-active' : ''}`}
                style={{ backgroundImage: `url(${banner.imageUrl})` }}
              >
                {(banner.title || banner.subtitle) && (
                  <div className="vitrin-slide-content">
                    {banner.title && <h1>{banner.title}</h1>}
                    {banner.subtitle && <p>{banner.subtitle}</p>}
                    {banner.buttonText && banner.linkUrl && (
                      <Link to={banner.linkUrl} className="vitrin-slide-btn">
                        {banner.buttonText}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <div className="vitrin-slider-dots">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  className={`vitrin-dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
          {banners.length > 1 && (
            <>
              <button
                className="vitrin-slider-arrow prev"
                onClick={() => goToSlide((currentSlide - 1 + banners.length) % banners.length)}
                aria-label="Önceki"
              >
                ‹
              </button>
              <button
                className="vitrin-slider-arrow next"
                onClick={() => goToSlide((currentSlide + 1) % banners.length)}
                aria-label="Sonraki"
              >
                ›
              </button>
            </>
          )}
        </section>
      ) : (
        <header className="vitrin-hero">
          <h1>
            Sağlıklı Yaşamın <span className="vitrin-hero-accent">Dijital Platformu</span>
          </h1>
          <p>
            En iyi spor kulüpleri, sertifikalı eğitmenler ve wellness hizmetleri tek çatı altında.
            Keşfet, karşılaştır, randevu al.
          </p>
          <div className="vitrin-hero-actions">
            <Link to="/register" className="vitrin-btn-primary">
              Ücretsiz Üye Ol
            </Link>
            <Link to="/partner-register" className="vitrin-btn-outline">
              Partner Başvurusu
            </Link>
          </div>
        </header>
      )}

      {/* Search Bar */}
      <div className="vitrin-search-section">
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

      {/* Category Tabs */}
      <div className="vitrin-categories">
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
        </div>
        {hasActiveFilters && (
          <button
            className="vitrin-filter-clear"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            ✕ Filtreleri Temizle
          </button>
        )}
        <div className="vitrin-view-toggle">
          <button
            className={`vitrin-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Liste görünümü"
          >
            ▦
          </button>
          <button
            className={`vitrin-view-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            aria-label="Harita görünümü"
          >
            🗺️
          </button>
        </div>
      </div>

      {loading && (
        <div className="vitrin-loading">
          <div className="vitrin-spinner" />
          <p>Keşfediliyor...</p>
        </div>
      )}

      {!loading && (
        <main className="vitrin-main">
          {/* Featured Clubs */}
          {clubs.filter((c) => c.featured).length > 0 && !hasActiveFilters && (
            <section className="vitrin-section">
              <div className="vitrin-section-header">
                <div>
                  <h2>⭐ Öne Çıkan Kulüpler</h2>
                  <p>Platform tarafından doğrulanmış premium partnerler</p>
                </div>
              </div>
              <div className="vitrin-featured-grid">
                {clubs
                  .filter((c) => c.featured)
                  .slice(0, 4)
                  .map((club) => (
                    <FeaturedClubCard key={club.id} club={club} />
                  ))}
              </div>
            </section>
          )}

          {/* All Clubs */}
          <section className="vitrin-section">
            <div className="vitrin-section-header">
              <div>
                <h2>
                  🏢{' '}
                  {verticalFilter
                    ? VERTICALS.find((v) => v.key === verticalFilter)?.label
                    : 'Tüm Kulüpler'}
                </h2>
                <p>{clubs.length} sonuç bulundu</p>
              </div>
            </div>
            {clubs.length === 0 ? (
              <div className="vitrin-empty">
                <span className="vitrin-empty-icon">🔍</span>
                <h3>Sonuç bulunamadı</h3>
                <p>Farklı filtreler deneyerek tekrar arayın.</p>
              </div>
            ) : viewMode === 'map' ? (
              <Suspense
                fallback={
                  <div className="vitrin-loading">
                    <div className="vitrin-spinner" />
                  </div>
                }
              >
                <ClubMap clubs={clubs} />
              </Suspense>
            ) : (
              <div className="vitrin-clubs-grid">
                {clubs.map((club) => (
                  <ClubCard key={club.id} club={club} />
                ))}
              </div>
            )}
          </section>

          {/* Trainers */}
          {trainers.length > 0 && !searchQuery && (
            <section className="vitrin-section">
              <div className="vitrin-section-header">
                <div>
                  <h2>💪 Popüler Eğitmenler</h2>
                  <p>Sertifikalı ve kullanıcılar tarafından derecelendirilmiş</p>
                </div>
                <Link to="/discover?vertical=" className="vitrin-see-all">
                  Tümünü Gör →
                </Link>
              </div>
              <div className="vitrin-trainers-grid">
                {trainers.map((tr) => (
                  <TrainerCard key={tr.id} trainer={tr} />
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {events.length > 0 && !searchQuery && (
            <section className="vitrin-section">
              <div className="vitrin-section-header">
                <div>
                  <h2>📅 Yaklaşan Etkinlikler</h2>
                  <p>Tüm kulüplerden açık etkinlikler ve dersler</p>
                </div>
              </div>
              <div className="vitrin-events-grid">
                {events.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}

          {/* Campaigns */}
          {campaigns.length > 0 && !searchQuery && (
            <section className="vitrin-section">
              <div className="vitrin-section-header">
                <div>
                  <h2>🔥 Aktif Kampanyalar</h2>
                  <p>Kaçırmayın — özel fırsatlar sınırlı süreyle geçerli</p>
                </div>
              </div>
              <div className="vitrin-campaigns-grid">
                {campaigns.map((camp) => (
                  <CampaignCard key={camp.id} campaign={camp} now={now} />
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <section className="vitrin-cta">
            <div className="vitrin-cta-content">
              <h2>Kulübünü Platforma Ekle</h2>
              <p>Binlerce potansiyel üyeye ulaş. Dijital vitrininle tanışmalarını sağla.</p>
              <div className="vitrin-cta-actions">
                <Link to="/partner-register" className="vitrin-btn-primary">
                  Partner Başvurusu
                </Link>
                <Link to="/register" className="vitrin-btn-outline">
                  Üye Ol
                </Link>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="vitrin-footer">
        <div className="vitrin-footer-top">
          <div className="vitrin-footer-brand">
            <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
            <p>Sağlıklı yaşamın dijital platformu</p>
          </div>
          <div className="vitrin-footer-col">
            <h4>Keşfet</h4>
            <Link to="/discover?vertical=fitness">Fitness</Link>
            <Link to="/discover?vertical=wellness">Wellness & Spa</Link>
            <Link to="/discover?vertical=padel">Padel & Tenis</Link>
            <Link to="/discover?vertical=yoga">Yoga & Pilates</Link>
          </div>
          <div className="vitrin-footer-col">
            <h4>Platform</h4>
            <Link to="/partner-register">Partner Ol</Link>
            <Link to="/trainer-register">Eğitmen Başvurusu</Link>
            <Link to="/pricing">Fiyatlandırma</Link>
            <Link to="/contact">İletişim</Link>
          </div>
          <div className="vitrin-footer-col">
            <h4>Yasal</h4>
            <Link to="/privacy">Gizlilik Sözleşmesi</Link>
            <Link to="/terms">Kullanım Şartları</Link>
            <Link to="/service-terms">Hizmet Şartları</Link>
          </div>
        </div>
        <div className="vitrin-footer-bottom">
          <p>© 2025 WellnessClub.tech — Tüm hakları saklıdır.</p>
          <div className="vitrin-footer-social">
            <a
              href="https://instagram.com/wellnessclub.tr"
              target="_blank"
              rel="noopener noreferrer"
            >
              📸 Instagram
            </a>
            <a href="mailto:info@wellnessclub.com">✉️ E-posta</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Card Components ─────────────────────────────────────────────────────────

function FeaturedClubCard({ club }: { club: Club }) {
  return (
    <Link to={`/club/${club.subdomain}`} className="vitrin-featured-card">
      <div className="vitrin-featured-cover">
        {club.coverImageUrl || club.logoUrl ? (
          <img src={club.coverImageUrl || club.logoUrl || ''} alt={club.name} />
        ) : (
          <div className="vitrin-featured-ph">{club.name.slice(0, 2).toUpperCase()}</div>
        )}
        <span className="vitrin-featured-badge">⭐ Öne Çıkan</span>
      </div>
      <div className="vitrin-featured-body">
        {club.logoUrl && <img src={club.logoUrl} alt="" className="vitrin-featured-logo" />}
        <h3>{club.name}</h3>
        {club.location && <p className="vitrin-card-location">📍 {club.location}</p>}
        <div className="vitrin-card-meta">
          {club.avgRating && Number(club.avgRating) > 0 && (
            <span className="vitrin-card-rating">★ {Number(club.avgRating).toFixed(1)}</span>
          )}
          {club.reviewCount ? (
            <span className="vitrin-card-reviews">({club.reviewCount})</span>
          ) : null}
          {club.priceRange && <span className="vitrin-card-price">{club.priceRange}</span>}
        </div>
        {club.services.length > 0 && (
          <div className="vitrin-card-tags">
            {club.services.slice(0, 3).map((s) => (
              <span key={s} className="vitrin-card-tag">
                {s}
              </span>
            ))}
            {club.services.length > 3 && (
              <span className="vitrin-card-tag more">+{club.services.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function ClubCard({ club }: { club: Club }) {
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
          {club.featured && <span className="vitrin-club-featured-dot">⭐</span>}
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

function TrainerCard({ trainer }: { trainer: Trainer }) {
  const { isFavorite, toggle, isLoggedIn } = useFavorite('trainer', trainer.id);

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
      <Link to={`/trainer/${trainer.id}`} className="vitrin-trainer-card">
        <div className="vitrin-trainer-photo">
          {trainer.photoUrl ? (
            <img src={trainer.photoUrl} alt={trainer.name} />
          ) : (
            <div className="vitrin-trainer-ph">{trainer.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="vitrin-trainer-body">
          <h3>{trainer.name}</h3>
          <p className="vitrin-trainer-club">{trainer.clubName}</p>
          <div className="vitrin-trainer-stats">
            <span className="vitrin-card-rating">★ {Number(trainer.avgRating).toFixed(1)}</span>
            <span className="vitrin-trainer-sessions">{trainer.totalSessions} seans</span>
          </div>
          {trainer.specialties.length > 0 && (
            <p className="vitrin-trainer-specs">{trainer.specialties.slice(0, 2).join(' · ')}</p>
          )}
        </div>
      </Link>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const date = new Date(event.startsAt);
  return (
    <Link to={`/event/${event.id}`} className="vitrin-event-card">
      {event.imageUrl && (
        <div className="vitrin-event-img">
          <img src={event.imageUrl} alt={event.title} />
          <span className="vitrin-event-date-badge">
            {date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      )}
      <div className="vitrin-event-body">
        <span className="vitrin-event-category">
          {event.category === 'general' ? '📋 Genel' : `🏷️ ${event.category}`}
        </span>
        <h3>{event.title}</h3>
        <p className="vitrin-event-time">
          🕐 {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          {event.endsAt &&
            ` - ${new Date(event.endsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
        </p>
        {event.location && <p className="vitrin-card-location">📍 {event.location}</p>}
        {event.clubName && <p className="vitrin-event-club">🏢 {event.clubName}</p>}
        <div className="vitrin-event-footer">
          {event.price !== '0' && <span className="vitrin-event-price">{event.price}₺</span>}
          {event.coachName && <span className="vitrin-event-coach">🏋️ {event.coachName}</span>}
        </div>
      </div>
    </Link>
  );
}

function CampaignCard({ campaign, now }: { campaign: Campaign; now: number }) {
  const discountText =
    campaign.discountKind === 'percentage'
      ? `%${campaign.discountValue} İndirim`
      : `₺${campaign.discountValue} İndirim`;
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.endsAt).getTime() - now) / 86400000));

  return (
    <div className="vitrin-campaign-card">
      {campaign.imageUrl && <img src={campaign.imageUrl} alt="" className="vitrin-campaign-img" />}
      <div className="vitrin-campaign-body">
        <div className="vitrin-campaign-header">
          <h3>{campaign.title}</h3>
          <span className="vitrin-campaign-badge">{discountText}</span>
        </div>
        {campaign.description && (
          <p className="vitrin-campaign-desc">{campaign.description.slice(0, 80)}</p>
        )}
        <div className="vitrin-campaign-footer">
          {campaign.tenant && (
            <span className="vitrin-campaign-club">🏢 {campaign.tenant.name}</span>
          )}
          <span className="vitrin-campaign-time">⏰ {daysLeft} gün kaldı</span>
        </div>
        {campaign.discountedPrice && (
          <div className="vitrin-campaign-prices">
            {campaign.originalPrice && (
              <span className="vitrin-price-old">
                ₺{parseFloat(campaign.originalPrice).toLocaleString('tr-TR')}
              </span>
            )}
            <span className="vitrin-price-new">
              ₺{parseFloat(campaign.discountedPrice).toLocaleString('tr-TR')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
