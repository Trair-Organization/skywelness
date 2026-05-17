import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';

type Club = {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  location: string | null;
  description: string | null;
  services: string[];
  avgRating: string | null;
  reviewCount: number | null;
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
  clubName: string | null;
  clubSubdomain: string | null;
  isJoined?: boolean;
};
type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  buttonText: string | null;
};

export function PublicDiscoverPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; title: string; description: string | null; discountKind: string; discountValue: string; originalPrice: string | null; discountedPrice: string | null; imageUrl: string | null; endsAt: string; tenant?: { name: string; subdomain: string } }>>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const slideInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (cityFilter) params.set('city', cityFilter);
      if (districtFilter) params.set('district', districtFilter);
      const [c, t, e, b, camp] = await Promise.all([
        apiJson<Club[]>(`/discovery/clubs?${params.toString()}`, { auth: false }),
        apiJson<Trainer[]>(`/discovery/trainers?limit=20${cityFilter ? `&city=${encodeURIComponent(cityFilter)}` : ''}`, { auth: false }),
        apiJson<Event[]>('/discovery/events?limit=12', { auth: false }),
        apiJson<Banner[]>('/home-banners', { auth: false }),
        apiJson<typeof campaigns>('/campaigns/public?limit=10', { auth: false }),
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
  }, [cityFilter, districtFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-slide
  useEffect(() => {
    if (banners.length <= 1) return;
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current);
    };
  }, [banners.length]);

  function goToSlide(idx: number) {
    setCurrentSlide(idx);
    if (slideInterval.current) clearInterval(slideInterval.current);
    slideInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 3000);
  }

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/partner-register">Partner Ol</Link>
          <Link to="/register">Üye Ol</Link>
          <Link to="/login" className="public-nav-login">
            Giriş Yap
          </Link>
        </div>
      </nav>

      {/* Hero Slider */}
      {banners.length > 0 ? (
        <section className="hero-slider">
          <div className="hero-slider-track">
            {banners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`hero-slide ${idx === currentSlide ? 'hero-slide-active' : ''}`}
                style={{ backgroundImage: `url(${banner.imageUrl})` }}
              >
                {(banner.title || banner.subtitle || banner.buttonText) && (
                  <div className="hero-slide-overlay">
                    {banner.title && <h1>{banner.title}</h1>}
                    {banner.subtitle && <p>{banner.subtitle}</p>}
                    {banner.buttonText && banner.linkUrl && (
                      <Link to={banner.linkUrl} className="btn-primary">
                        {banner.buttonText}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <div className="hero-slider-dots">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  className={`hero-dot ${idx === currentSlide ? 'hero-dot-active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
          {banners.length > 1 && (
            <>
              <button
                className="hero-slider-arrow hero-slider-prev"
                onClick={() => goToSlide((currentSlide - 1 + banners.length) % banners.length)}
                aria-label="Önceki"
              >
                ‹
              </button>
              <button
                className="hero-slider-arrow hero-slider-next"
                onClick={() => goToSlide((currentSlide + 1) % banners.length)}
                aria-label="Sonraki"
              >
                ›
              </button>
            </>
          )}
        </section>
      ) : (
        <header className="discover-hero">
          <h1>Sağlıklı Yaşamın Merkezi</h1>
          <p>
            En iyi spor kulüpleri, sertifikalı eğitmenler ve wellness hizmetleri tek platformda.
            Hemen keşfet, üye ol veya partner başvurusu yap.
          </p>
          <div className="discover-hero-actions">
            <Link to="/register" className="btn-primary">
              Ücretsiz Üye Ol
            </Link>
            <Link to="/partner-register" className="btn-outline">
              Partner Başvurusu
            </Link>
          </div>
        </header>
      )}

      {loading && <div className="discover-loading">Yükleniyor...</div>}

      {/* Lokasyon Filtresi */}
      {!loading && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>📍 Lokasyon:</span>
          <select
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setDistrictFilter(''); }}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
          >
            <option value="">Tüm İller</option>
            {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {cityFilter && (
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
            >
              <option value="">Tüm İlçeler</option>
              {getDistricts(cityFilter).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {cityFilter && <button onClick={() => { setCityFilter(''); setDistrictFilter(''); }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>✕ Temizle</button>}
        </div>
      )}

      {/* Kulüpler */}
      {clubs.length > 0 && (
        <section className="discover-section">
          <div className="discover-section-header">
            <h2>🏢 Popüler Kulüpler</h2>
            <p>Doğrulanmış ve güvenilir spor & wellness merkezleri</p>
          </div>
          <div className="discover-grid clubs-grid">
            {clubs.map((club) => (
              <Link key={club.id} to={`/club/${club.subdomain}`} className="discover-card club-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="club-card-cover">
                  {club.coverImageUrl || club.logoUrl ? (
                    <img
                      src={club.coverImageUrl || club.logoUrl || ''}
                      alt={club.name}
                    />
                  ) : (
                    <div className="club-card-cover-ph">
                      {club.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="discover-card-body">
                  <h3>{club.name}</h3>
                  {club.location && (
                    <p className="discover-meta">📍 {club.location}</p>
                  )}
                  {club.avgRating && (
                    <p className="discover-meta">
                      ★ {Number(club.avgRating).toFixed(1)}
                      {club.reviewCount ? ` (${club.reviewCount} değerlendirme)` : ''}
                    </p>
                  )}
                  {club.services.length > 0 && (
                    <div className="discover-tags">
                      {club.services.slice(0, 3).map((s) => (
                        <span key={s} className="discover-tag">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Eğitmenler */}
      {trainers.length > 0 && (
        <section className="discover-section">
          <div className="discover-section-header">
            <h2>💪 Öne Çıkan Eğitmenler</h2>
            <p>Sertifikalı, doğrulanmış ve kullanıcılar tarafından derecelendirilmiş</p>
          </div>
          <div className="discover-grid trainers-grid">
            {trainers.map((tr) => (
              <Link key={tr.id} to={`/trainer/${tr.id}`} className="discover-card trainer-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="trainer-card-photo">
                  {tr.photoUrl ? (
                    <img src={tr.photoUrl} alt={tr.name} />
                  ) : (
                    <div className="trainer-card-photo-ph">
                      {tr.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="discover-card-body">
                  <h3>{tr.name}</h3>
                  <p className="discover-meta">
                    ★ {Number(tr.avgRating).toFixed(1)} · {tr.totalSessions} seans
                  </p>
                  <p className="discover-meta">{tr.clubName}</p>
                  {tr.specialties.length > 0 && (
                    <p className="discover-meta trainer-specialties">
                      {tr.specialties.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Etkinlikler */}
      {events.length > 0 && (
        <section className="discover-section">
          <div className="discover-section-header">
            <h2>📅 Yaklaşan Etkinlikler</h2>
            <p>Tüm kulüplerden açık etkinlikler</p>
          </div>
          <div className="discover-grid events-grid">
            {events.map((ev) => (
              <Link key={ev.id} to={`/event/${ev.id}`} className="discover-card event-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                {ev.imageUrl && (
                  <div className="event-card-img">
                    <img src={ev.imageUrl} alt={ev.title} />
                  </div>
                )}
                <div className="discover-card-body">
                  <h3>{ev.title}</h3>
                  <p className="discover-meta">
                    📅{' '}
                    {new Date(ev.startsAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {ev.location && <p className="discover-meta">📍 {ev.location}</p>}
                  {ev.clubName && <p className="discover-meta">🏢 {ev.clubName}</p>}
                  {ev.coachName && <p className="discover-meta">🏋️ {ev.coachName}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Kampanyalar */}
      {campaigns.length > 0 && (
        <section className="discover-section">
          <div className="discover-section-header">
            <h2>🔥 Aktif Kampanyalar</h2>
            <p>Kulüplerden size özel fırsatlar</p>
          </div>
          <div className="discover-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {campaigns.map((camp) => {
              const discountText = camp.discountKind === 'percentage' ? `%${camp.discountValue} İndirim` : `₺${camp.discountValue} İndirim`;
              return (
                <div key={camp.id} className="discover-card" style={{ overflow: 'hidden' }}>
                  {camp.imageUrl && <img src={camp.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover' }} />}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{camp.title}</h3>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: '#dcfce7', color: '#166534', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{discountText}</span>
                    </div>
                    {camp.description && <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: '#64748b' }}>{camp.description.slice(0, 80)}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {camp.tenant && <span>🏢 {camp.tenant.name}</span>}
                      <span>⏰ {new Date(camp.endsAt).toLocaleDateString('tr-TR')}'e kadar</span>
                    </div>
                    {camp.discountedPrice && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {camp.originalPrice && <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.82rem' }}>₺{parseFloat(camp.originalPrice).toLocaleString('tr-TR')}</span>}
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '1.1rem' }}>₺{parseFloat(camp.discountedPrice).toLocaleString('tr-TR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="discover-cta-section">
        <h2>Hemen Başla</h2>
        <p>Üye ol, kulüp keşfet, eğitmenlerle çalış.</p>
        <div className="discover-hero-actions">
          <Link to="/register" className="btn-primary">
            Üye Ol
          </Link>
          <Link to="/partner-register" className="btn-outline">
            Partner Başvurusu
          </Link>
        </div>
      </section>

      <footer className="public-footer">
        <div className="public-footer-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <p>Sağlıklı yaşamın dijital platformu</p>
        </div>
        <div className="public-footer-contact">
          <a href="https://instagram.com/wellnessclub.tr" target="_blank" rel="noopener noreferrer">📸 @wellnessclub.tr</a>
          <a href="mailto:info@wellnessclub.com">✉️ info@wellnessclub.com</a>
        </div>
        <div className="public-footer-links">
          <Link to="/privacy">Gizlilik Sözleşmesi</Link>
          <Link to="/terms">Kullanım Şartları</Link>
          <Link to="/contact">İletişim</Link>
          <Link to="/trainer-register">Eğitmen Başvurusu</Link>
          <Link to="/partner-register">Partner Başvurusu</Link>
        </div>
        <p className="public-footer-copy">© 2025 Wellness Club. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
