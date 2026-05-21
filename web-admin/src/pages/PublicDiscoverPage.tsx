import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';

const ClubMap = lazy(() => import('../components/ClubMap').then((m) => ({ default: m.ClubMap })));

import { useFavorite } from '../hooks/useFavorite';
import { trainerProfilePath } from '../lib/trainerUrl';
import { PublicNav } from '../components/PublicNav';
import { PartnerBadges } from '../components/PartnerBadges';

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
  badges: string[];
  latitude: string | null;
  longitude: string | null;
};
type Trainer = {
  id: string;
  userId: string;
  publicId: string | null;
  slug: string | null;
  name: string;
  photoUrl: string | null;
  specialties: string[];
  avgRating: string;
  totalSessions: number;
  clubName: string;
  clubSubdomain: string;
  city: string | null;
  badges: string[];
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
  { key: 'nutrition', label: 'Beslenme & Diyet', icon: '🥗' },
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
      {/* Announcement Bar */}
      <div className="vitrin-announcement-bar">
        <span>
          🎉 <strong>Skyland Wellness</strong> artık platformumuzda!
        </span>
        <Link to="/club/skyland-wellness" className="vitrin-announcement-link">
          Keşfet →
        </Link>
      </div>

      {/* Navigation */}
      <PublicNav active="discover" />

      {/* Hero Slider */}
      {banners.length > 0 ? (
        <section className="vitrin-hero-slider">
          <div className="vitrin-slider-track">
            {banners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`vitrin-slide ${idx === currentSlide ? 'vitrin-slide-active' : ''}`}
              >
                <div
                  className="vitrin-slide-bg"
                  style={{ backgroundImage: `url(${banner.imageUrl})` }}
                />
                <img src={banner.imageUrl} alt={banner.title || ''} className="vitrin-slide-img" />
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

      {/* Stats Strip — sosyal kanıt */}
      <div className="vitrin-stats-strip">
        <div className="vitrin-stat-item">
          <span className="vitrin-stat-icon">🏢</span>
          <div>
            <strong>{clubs.length}+</strong>
            <span>Kulüp</span>
          </div>
        </div>
        <div className="vitrin-stat-item">
          <span className="vitrin-stat-icon">💪</span>
          <div>
            <strong>{trainers.length}+</strong>
            <span>Eğitmen</span>
          </div>
        </div>
        <div className="vitrin-stat-item">
          <span className="vitrin-stat-icon">📅</span>
          <div>
            <strong>{events.length}+</strong>
            <span>Etkinlik</span>
          </div>
        </div>
        <div className="vitrin-stat-item">
          <span className="vitrin-stat-icon">⭐</span>
          <div>
            <strong>4.8</strong>
            <span>Ortalama Puan</span>
          </div>
        </div>
        <div className="vitrin-stat-item">
          <span className="vitrin-stat-icon">📍</span>
          <div>
            <strong>{new Set(clubs.map((c) => c.city).filter(Boolean)).size || 12}+</strong>
            <span>Şehir</span>
          </div>
        </div>
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

      {/* Search + Filters Row (tek satır) */}
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
        <main className="vitrin-main">
          <section className="vitrin-section">
            <div className="vitrin-section-header">
              <div>
                <h2>🏢 Kulüpler</h2>
                <p>Yükleniyor...</p>
              </div>
            </div>
            <div className="vitrin-clubs-grid">
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
          </section>
        </main>
      )}

      {!loading && (
        <main className="vitrin-main">
          {/* Campaigns - en üstte */}
          {campaigns.length > 0 && !searchQuery && (
            <section className="vitrin-section">
              <div className="vitrin-section-header">
                <div>
                  <h2>🔥 Aktif Kampanyalar</h2>
                  <p>Kaçırmayın — özel fırsatlar sınırlı süreyle geçerli</p>
                </div>
                <Link to="/all-campaigns" className="vitrin-see-all">
                  Tümünü Gör →
                </Link>
              </div>
              <div className="vitrin-campaigns-grid">
                {campaigns.map((camp) => (
                  <CampaignCard key={camp.id} campaign={camp} now={now} />
                ))}
              </div>
            </section>
          )}

          {/* Featured Clubs */}
          {clubs.filter((c) => c.featured).length > 0 && !hasActiveFilters && (
            <section className="vitrin-section">
              <div className="vitrin-section-header">
                <div>
                  <h2>⭐ Öne Çıkan Kulüpler</h2>
                  <p>Platform tarafından doğrulanmış premium partnerler</p>
                </div>
                <Link to="/featured-clubs" className="vitrin-see-all">
                  Tümünü Gör →
                </Link>
              </div>
              <div className="vitrin-featured-grid">
                {clubs
                  .filter((c) => c.featured)
                  .slice(0, 4)
                  .map((club) => (
                    <ClubCard key={club.id} club={club} />
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
                <Link to="/all-events" className="vitrin-see-all">
                  Tümünü Gör →
                </Link>
              </div>
              <div className="vitrin-events-grid">
                {events.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
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
              <Link to="/all-clubs" className="vitrin-see-all">
                Tümünü Gör →
              </Link>
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
                <Link to="/all-trainers" className="vitrin-see-all">
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
        {/* App Download Banner */}
        <div className="vitrin-app-banner">
          <div className="vitrin-app-banner-content">
            <h3>📱 Mobil uygulamamız çok yakında</h3>
            <p>İlk haberi alanlara özel kampanyalar — şimdi e-posta bırakın</p>
            <form
              className="vitrin-app-banner-form"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget as HTMLFormElement);
                const email = fd.get('email');
                if (email) {
                  alert('Teşekkürler! Lansmanda haberdar olacaksınız.');
                  (e.currentTarget as HTMLFormElement).reset();
                }
              }}
            >
              <input
                type="email"
                name="email"
                placeholder="ornek@mail.com"
                required
                className="vitrin-app-banner-input"
              />
              <button type="submit" className="vitrin-app-banner-btn">
                Haberdar Et
              </button>
            </form>
          </div>
          <div className="vitrin-app-banner-badges">
            <span className="vitrin-store-badge">
              <span className="vitrin-store-icon">🍎</span>
              <div>
                <small>Çok Yakında</small>
                <strong>App Store</strong>
              </div>
            </span>
            <span className="vitrin-store-badge">
              <span className="vitrin-store-icon">▶</span>
              <div>
                <small>Çok Yakında</small>
                <strong>Google Play</strong>
              </div>
            </span>
          </div>
        </div>

        <div className="vitrin-footer-top">
          <div className="vitrin-footer-brand">
            <img src="/wellnesslogodaire.png?v=2" alt="Wellness Club" className="nav-logo" />
            <p>Sağlıklı yaşamın dijital platformu</p>
            <div className="vitrin-footer-trust">
              <span className="vitrin-trust-item">🔒 SSL Güvenli</span>
              <span className="vitrin-trust-item">🛡️ KVKK Uyumlu</span>
            </div>
          </div>
          <div className="vitrin-footer-col">
            <h4>Keşfet</h4>
            <Link to="/discover?vertical=fitness">Fitness</Link>
            <Link to="/discover?vertical=wellness">Wellness & Spa</Link>
            <Link to="/discover?vertical=padel">Padel & Tenis</Link>
            <Link to="/discover?vertical=nutrition">Beslenme & Diyet</Link>
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
            <Link to="/privacy">KVKK Aydınlatma Metni</Link>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="vitrin-footer-payments">
          <span className="vitrin-payment-label">Güvenli Ödeme:</span>
          <div className="vitrin-payment-icons">
            <span className="vitrin-payment-badge">VISA</span>
            <span className="vitrin-payment-badge">Mastercard</span>
            <span className="vitrin-payment-badge">Troy</span>
            <span className="vitrin-payment-badge">🔒 3D Secure</span>
            <span className="vitrin-payment-badge">Stripe</span>
          </div>
        </div>

        <div className="vitrin-footer-bottom">
          <p>© 2026 WellnessClub.tech — Tüm hakları saklıdır.</p>
          <div className="vitrin-footer-social">
            <a
              href="https://instagram.com/wellnessclub.tr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              📸
            </a>
            <a
              href="https://twitter.com/wellnessclub_tr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
            >
              𝕏
            </a>
            <a
              href="https://linkedin.com/company/wellnessclub-tr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              💼
            </a>
            <a href="mailto:info@wellnessclub.tech" aria-label="E-posta">
              ✉️
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Card Components ─────────────────────────────────────────────────────────

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
            <>
              <img
                src={club.coverImageUrl || club.logoUrl || ''}
                alt=""
                className="vitrin-cover-blur"
                aria-hidden="true"
              />
              <img src={club.coverImageUrl || club.logoUrl || ''} alt={club.name} />
            </>
          ) : (
            <div className="vitrin-club-ph">{club.name.slice(0, 2).toUpperCase()}</div>
          )}
          {club.vertical && (
            <span className="vitrin-club-vertical">
              {VERTICALS.find((v) => v.key === club.vertical)?.icon || '🏢'}
            </span>
          )}
        </div>
        <div className="vitrin-club-body">
          <div className="vitrin-card-name-row">
            <h3>{club.name}</h3>
            {club.avgRating && Number(club.avgRating) > 0 && (
              <Link
                to={`/club/${club.subdomain}#pp-reviews`}
                className="vitrin-card-rating-inline"
                onClick={(e) => e.stopPropagation()}
              >
                ★ {Number(club.avgRating).toFixed(1)}
                {club.reviewCount ? ` (${club.reviewCount})` : ''}
              </Link>
            )}
          </div>
          <PartnerBadges badges={club.badges ?? []} max={3} />
          {club.location && <p className="vitrin-card-location">📍 {club.location}</p>}
          <div className="vitrin-card-meta">
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
      <Link
        to={trainerProfilePath({
          slug: trainer.slug,
          publicId: trainer.publicId,
          fallbackId: trainer.id,
        })}
        className="vitrin-trainer-card"
      >
        <div className="vitrin-trainer-photo">
          {trainer.photoUrl ? (
            <>
              <img src={trainer.photoUrl} alt="" className="vitrin-cover-blur" aria-hidden="true" />
              <img src={trainer.photoUrl} alt={trainer.name} />
            </>
          ) : (
            <div className="vitrin-trainer-ph">{trainer.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className="vitrin-trainer-body">
          <div className="vitrin-card-name-row">
            <h3>{trainer.name}</h3>
            {Number(trainer.avgRating) > 0 && (
              <Link
                to={`${trainerProfilePath({ slug: trainer.slug, publicId: trainer.publicId, fallbackId: trainer.id })}#reviews`}
                className="vitrin-card-rating-inline"
                onClick={(e) => e.stopPropagation()}
              >
                ★ {Number(trainer.avgRating).toFixed(1)}
              </Link>
            )}
          </div>
          <p className="vitrin-trainer-club">🏢 {trainer.clubName}</p>
          <PartnerBadges badges={trainer.badges ?? []} max={3} />
          {trainer.totalSessions > 0 && (
            <span className="vitrin-trainer-sessions-text">{trainer.totalSessions} seans</span>
          )}
          {trainer.specialties.length > 0 && (
            <div className="vitrin-card-tags">
              {trainer.specialties.slice(0, 2).map((s) => (
                <span key={s} className="vitrin-card-tag">
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="vitrin-card-cta">
            <span className="vitrin-card-cta-btn">Profili Gör →</span>
          </div>
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
          <img src={event.imageUrl} alt="" className="vitrin-cover-blur" aria-hidden="true" />
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
          {event.price !== '0' && Number(event.price) > 0 ? (
            <span className="vitrin-event-price">{event.price}₺</span>
          ) : (
            <span className="vitrin-event-price vitrin-event-free">Ücretsiz</span>
          )}
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
    <Link to={`/campaign/${campaign.id}`} className="vitrin-campaign-card">
      <div className="vitrin-campaign-cover">
        {campaign.imageUrl ? (
          <>
            <img src={campaign.imageUrl} alt="" className="vitrin-cover-blur" aria-hidden="true" />
            <img src={campaign.imageUrl} alt={campaign.title} />
          </>
        ) : (
          <div className="vitrin-campaign-ph">🔥</div>
        )}
        <span className="vitrin-campaign-badge">{discountText}</span>
        {daysLeft <= 3 && (
          <span
            className="vitrin-badge"
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              background: 'rgba(220,38,38,0.92)',
              color: '#fff',
              border: '1px solid rgba(220,38,38,0.3)',
            }}
          >
            🔥 Son {daysLeft} gün
          </span>
        )}
      </div>
      <div className="vitrin-campaign-body">
        <h3>{campaign.title}</h3>
        {campaign.description && (
          <p className="vitrin-campaign-desc">{campaign.description.slice(0, 80)}</p>
        )}
        <div className="vitrin-campaign-meta">
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
        <div className="vitrin-card-cta">
          <span className="vitrin-card-cta-btn">Detayları Gör →</span>
        </div>
      </div>
    </Link>
  );
}
