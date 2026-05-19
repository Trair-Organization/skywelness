import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useFavorite } from '../hooks/useFavorite';

// ═══ Types ═══════════════════════════════════════════════════════════════════

type ProfileData = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  galleryImages: string[];
  services: string[];
  vertical: string;
  avgRating: string;
  reviewCount: number;
  priceRange: string | null;
  trainers: Array<{
    id: string;
    name: string;
    photoUrl: string | null;
    specializations: string[];
    offersSessionTypes: string[];
    avgRating: string;
    totalSessions: number;
  }>;
  packages: Array<{
    id: string;
    name: string;
    sessionCount: number;
    price: string;
    currency: string;
    validityDays: number;
    sessionType: string;
  }>;
  resources: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: string;
    currency: string;
    capacity: number;
  }>;
  catalogServices: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    durationMinutes: number;
    price: string;
    currency: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startsAt: string;
    imageUrl: string | null;
    coachName: string | null;
    location: string | null;
    price: string;
    currency: string;
  }>;
  metrics: {
    memberCount: number;
    totalBookings: number;
    trainerCount: number;
  };
};

type V2Service = {
  id: string;
  name: string;
  category: string;
  providerType: string;
  providerId: string | null;
  providerName: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  capacity: number;
};

type V2Slot = {
  id: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  price: string;
  remainingCapacity: number;
};

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; photoUrl: string | null };
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
};

type Addon = { id: string; name: string; price: string };

// ═══ Section definitions ═════════════════════════════════════════════════════

const SECTIONS = [
  { id: 'about', icon: '🏢', label: 'Hakkımızda' },
  { id: 'campaigns', icon: '🔥', label: 'Kampanyalar' },
  { id: 'events', icon: '📅', label: 'Etkinlikler' },
  { id: 'booking', icon: '🎯', label: 'Rezervasyon' },
  { id: 'products', icon: '🛍️', label: 'Ürünler' },
  { id: 'trainers', icon: '🏋️', label: 'Eğitmenler' },
  { id: 'reviews', icon: '⭐', label: 'Yorumlar' },
  { id: 'message', icon: '💬', label: 'Mesaj' },
] as const;

// ═══ Helper: Week days ═══════════════════════════════════════════════════════

function getWeekDays(weekOffset: number) {
  const days = [];
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const start = new Date();
  start.setDate(start.getDate() + weekOffset * 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push({
      value: d.toISOString().slice(0, 10),
      dayName: dayNames[d.getDay()],
      label: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return days;
}

// ═══ Main Component ══════════════════════════════════════════════════════════

export function ClubProfilePage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { token } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState('0');
  const isLoggedIn = !!token;
  const [activeSection, setActiveSection] = useState('about');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Load profile
  const loadProfile = useCallback(async () => {
    if (!subdomain) return;
    try {
      const data = await apiJson<ProfileData>(`/tenants/${encodeURIComponent(subdomain)}/profile`, {
        auth: false,
      });
      setProfile(data);
      // Campaigns
      try {
        const c = await apiJson<Campaign[]>(
          `/campaigns/public?tenantSubdomain=${encodeURIComponent(subdomain)}&limit=10`,
          { auth: false },
        );
        setCampaigns(c);
      } catch {
        /* */
      }
      // Reviews
      try {
        const r = await apiJson<{
          reviews: ReviewItem[];
          total: number;
          avgRating: string;
          reviewCount: number;
        }>(`/clubs/${encodeURIComponent(subdomain)}/reviews?limit=10`, { auth: false });
        setReviews(r.reviews);
        setReviewCount(r.reviewCount);
        setAvgRating(r.avgRating);
      } catch {
        /* */
      }
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadProfile();
    });
  }, [loadProfile]);

  // IntersectionObserver for active section
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(s.id);
        },
        { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [profile]);

  if (loading)
    return (
      <div className="public-shell">
        <div className="pp-loading">Yükleniyor...</div>
      </div>
    );
  if (!profile)
    return (
      <div className="public-shell">
        <div className="pp-loading">Profil bulunamadı</div>
      </div>
    );

  const images =
    profile.galleryImages.length > 0
      ? profile.galleryImages
      : profile.coverImageUrl
        ? [profile.coverImageUrl]
        : [];
  const ptTrainers = profile.trainers.filter((t) =>
    (t.offersSessionTypes || []).includes('personal_training'),
  );
  const massageTrainers = profile.trainers.filter((t) =>
    (t.offersSessionTypes || []).includes('massage'),
  );
  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === 'about') return !!profile.description;
    if (s.id === 'products')
      return (
        profile.packages.length > 0 ||
        profile.resources.length > 0 ||
        (profile.catalogServices?.length ?? 0) > 0
      );
    if (s.id === 'reviews') return true;
    if (s.id === 'trainers') return profile.trainers.length > 0;
    if (s.id === 'events') return profile.events.length > 0;
    if (s.id === 'campaigns') return campaigns.length > 0;
    if (s.id === 'booking') return true;
    if (s.id === 'message') return true;
    return true;
  });

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="public-shell">
      {/* Nav */}
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

      <div className="pp-page">
        {/* ═══ HERO SLIDER ═══ */}
        <div className="pp-hero">
          {images.length > 0 ? (
            <>
              <img src={images[galleryIdx]} alt={profile.name} className="pp-hero-img" />
              {images.length > 1 && (
                <>
                  <button
                    className="pp-hero-arrow prev"
                    onClick={() => setGalleryIdx((galleryIdx - 1 + images.length) % images.length)}
                  >
                    ‹
                  </button>
                  <button
                    className="pp-hero-arrow next"
                    onClick={() => setGalleryIdx((galleryIdx + 1) % images.length)}
                  >
                    ›
                  </button>
                  <div className="pp-hero-dots">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={`pp-dot ${i === galleryIdx ? 'active' : ''}`}
                        onClick={() => setGalleryIdx(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="pp-hero-ph">
              <span>{profile.name.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="pp-thumbs">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className={`pp-thumb ${i === galleryIdx ? 'active' : ''}`}
                onClick={() => {
                  setGalleryIdx(i);
                  setLightboxOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {/* ═══ IDENTITY HEADER ═══ */}
        <div className="pp-identity">
          <div className="pp-identity-main">
            {profile.logoUrl && <img src={profile.logoUrl} alt="" className="pp-logo" />}
            <div>
              <h1 className="pp-name">{profile.name}</h1>
              {profile.location && <p className="pp-location">📍 {profile.location}</p>}
            </div>
            {Number(profile.avgRating) > 0 && (
              <span className="pp-rating">
                ★ {Number(avgRating || profile.avgRating).toFixed(1)}{' '}
                <small>({reviewCount || profile.reviewCount})</small>
              </span>
            )}
          </div>
          <div className="pp-identity-actions">
            {isLoggedIn && <FavoriteBtn profileId={profile.id} />}
            {isLoggedIn && <MessageBtn subdomain={subdomain!} />}
            {profile.metrics.memberCount > 0 && (
              <div className="pp-metric-inline">
                <strong>{profile.metrics.memberCount}</strong>
                <span>Üye</span>
              </div>
            )}
            {profile.metrics.totalBookings > 0 && (
              <div className="pp-metric-inline">
                <strong>{profile.metrics.totalBookings}</strong>
                <span>Randevu</span>
              </div>
            )}
            {profile.metrics.trainerCount > 0 && (
              <div className="pp-metric-inline">
                <strong>{profile.metrics.trainerCount}</strong>
                <span>Eğitmen</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ STICKY SECTION NAVIGATOR ═══ */}
        <div className="pp-nav-sticky">
          <div className="pp-nav-scroll">
            {visibleSections.map((s) => (
              <button
                key={s.id}
                className={`pp-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => scrollToSection(s.id)}
              >
                <span className="pp-nav-icon">{s.icon}</span>
                <span className="pp-nav-label">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ HAKKIMIZDA ═══ */}
        {profile.description && (
          <section
            ref={(el) => {
              sectionRefs.current['about'] = el;
            }}
            className="pp-section"
            id="pp-about"
          >
            <h2>🏢 Hakkımızda</h2>
            <p className="pp-desc">{profile.description}</p>
            {profile.services.length > 0 && (
              <div className="pp-chips">
                {profile.services.map((s, i) => (
                  <span key={i} className="pp-chip">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ═══ KAMPANYALAR ═══ */}
        {campaigns.length > 0 && (
          <section
            ref={(el) => {
              sectionRefs.current['campaigns'] = el;
            }}
            className="pp-section"
            id="pp-campaigns"
          >
            <h2>🔥 Kampanyalar</h2>
            <div className="pp-campaigns-grid">
              {campaigns.map((c) => {
                const discount =
                  c.discountKind === 'percentage' ? `%${c.discountValue}` : `₺${c.discountValue}`;
                return (
                  <div key={c.id} className="pp-campaign-card">
                    {c.imageUrl && <img src={c.imageUrl} alt="" className="pp-campaign-img" />}
                    <div className="pp-campaign-body">
                      <div className="pp-campaign-head">
                        <strong>{c.title}</strong>
                        <span className="pp-campaign-badge">{discount}</span>
                      </div>
                      {c.description && <p>{c.description.slice(0, 60)}</p>}
                      {c.discountedPrice && (
                        <div className="pp-campaign-prices">
                          {c.originalPrice && (
                            <span className="pp-price-old">
                              ₺{parseFloat(c.originalPrice).toLocaleString('tr-TR')}
                            </span>
                          )}
                          <span className="pp-price-new">
                            ₺{parseFloat(c.discountedPrice).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      )}
                      <span className="pp-campaign-exp">
                        ⏰ {new Date(c.endsAt).toLocaleDateString('tr-TR')}'e kadar
                      </span>
                      <CampaignBuyBtn
                        campaignId={c.id}
                        price={c.discountedPrice || c.originalPrice}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ ETKİNLİKLER ═══ */}
        {profile.events.length > 0 && (
          <section
            ref={(el) => {
              sectionRefs.current['events'] = el;
            }}
            className="pp-section"
            id="pp-events"
          >
            <h2>📅 Etkinlikler</h2>
            <div className="pp-events-scroll">
              {profile.events.map((e) => (
                <div key={e.id} className="pp-event-card">
                  <Link to={`/event/${e.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {e.imageUrl && <img src={e.imageUrl} alt="" className="pp-event-img" />}
                    <div className="pp-event-body">
                      <strong>{e.title}</strong>
                      <span>
                        {new Date(e.startsAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {e.coachName && <span>🏋️ {e.coachName}</span>}
                      {e.price && parseFloat(e.price) > 0 && (
                        <span className="pp-event-price">💰 {e.price}₺</span>
                      )}
                    </div>
                  </Link>
                  {e.price && parseFloat(e.price) > 0 && (
                    <EventBuyBtn eventId={e.id} price={e.price} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ REZERVASYON ═══ */}
        <section
          ref={(el) => {
            sectionRefs.current['booking'] = el;
          }}
          className="pp-section"
          id="pp-booking"
        >
          <h2>🎯 Rezervasyon</h2>
          <BookingSection subdomain={subdomain!} />
        </section>

        {/* ═══ ÜRÜN VE HİZMETLER ═══ */}
        {(profile.packages.length > 0 ||
          profile.resources.length > 0 ||
          (profile.catalogServices?.length ?? 0) > 0) && (
          <section
            ref={(el) => {
              sectionRefs.current['products'] = el;
            }}
            className="pp-section"
            id="pp-products"
          >
            <h2>🛍️ Ürün ve Hizmetler</h2>
            {profile.packages.length > 0 && (
              <Accordion title="💎 Paketler" defaultOpen={false}>
                <div className="pp-packages-grid">
                  {profile.packages.map((pkg) => (
                    <div key={pkg.id} className="pp-package-card">
                      <h4>{pkg.name}</h4>
                      <p>
                        {pkg.sessionCount} seans · {pkg.validityDays} gün ·{' '}
                        {pkg.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'}
                      </p>
                      <div className="pp-package-price">
                        <strong>{pkg.price}₺</strong>
                        <span>{Math.round(parseFloat(pkg.price) / pkg.sessionCount)}₺/seans</span>
                      </div>
                      <PackageBuyBtn packageId={pkg.id} />
                    </div>
                  ))}
                </div>
              </Accordion>
            )}
            {profile.resources.length > 0 && (
              <Accordion title="🏷️ Hizmetler" defaultOpen={false}>
                <div className="pp-resources-grid">
                  {profile.resources.map((r) => (
                    <div key={r.id} className="pp-resource-card">
                      <strong>{r.name}</strong>
                      {r.description && <p>{r.description}</p>}
                      <div className="pp-resource-meta">
                        <span>⏱️ {r.durationMinutes}dk</span>
                        <span className="pp-resource-price">{r.price}₺</span>
                      </div>
                      <button
                        className="pp-buy-btn"
                        style={{ marginTop: 8 }}
                        onClick={() => scrollToSection('booking')}
                      >
                        🎯 Randevu Al
                      </button>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}
            {(profile.catalogServices?.length ?? 0) > 0 && (
              <Accordion title="📋 Hizmet Kataloğu" defaultOpen={false}>
                <div className="pp-resources-grid">
                  {profile.catalogServices.map((s) => (
                    <div key={s.id} className="pp-resource-card">
                      <strong>{s.name}</strong>
                      {s.description && <p>{s.description}</p>}
                      <div className="pp-resource-meta">
                        <span>
                          ⏱️ {s.durationMinutes}dk · {s.category}
                        </span>
                        <span className="pp-resource-price">{s.price}₺</span>
                      </div>
                      <button
                        className="pp-buy-btn"
                        style={{ marginTop: 8 }}
                        onClick={() => scrollToSection('booking')}
                      >
                        🎯 Randevu Al
                      </button>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}
          </section>
        )}

        {/* ═══ EĞİTMENLER ═══ */}
        {profile.trainers.length > 0 && (
          <section
            ref={(el) => {
              sectionRefs.current['trainers'] = el;
            }}
            className="pp-section"
            id="pp-trainers"
          >
            <h2>🏋️ Eğitmenler</h2>
            {ptTrainers.length > 0 && (
              <>
                <h3 className="pp-sub">Personal Training</h3>
                <div className="pp-trainers-grid">
                  {ptTrainers.map((t) => (
                    <TrainerCard key={t.id} trainer={t} />
                  ))}
                </div>
              </>
            )}
            {massageTrainers.length > 0 && (
              <>
                <h3 className="pp-sub">Masözler</h3>
                <div className="pp-trainers-grid">
                  {massageTrainers.map((t) => (
                    <TrainerCard key={t.id} trainer={t} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* ═══ MESAJ ═══ */}
        <section
          ref={(el) => {
            sectionRefs.current['message'] = el;
          }}
          className="pp-section"
          id="pp-message"
        >
          <h2>💬 Kulübe Mesaj Gönder</h2>
          {isLoggedIn ? (
            <MessageBtn subdomain={subdomain!} large />
          ) : (
            <div className="pp-login-prompt">
              <p>Mesaj göndermek için giriş yapın</p>
              <Link to="/login" className="btn-primary">
                Giriş Yap
              </Link>
            </div>
          )}
        </section>

        {/* ═══ DEĞERLENDİRMELER (sayfa sonu) ═══ */}
        <section
          ref={(el) => {
            sectionRefs.current['reviews'] = el;
          }}
          className="pp-section"
          id="pp-reviews"
        >
          <h2>⭐ Değerlendirmeler</h2>
          {reviewCount > 0 && (
            <div className="pp-review-summary">
              <div className="pp-review-avg">{Number(avgRating).toFixed(1)}</div>
              <div className="pp-review-count">{reviewCount} değerlendirme</div>
            </div>
          )}
          {reviews.length > 0 ? (
            <div className="pp-reviews-list">
              {reviews.map((r) => (
                <div key={r.id} className="pp-review-item">
                  <div className="pp-review-head">
                    <span className="pp-review-user">
                      {r.user.firstName} {r.user.lastName}
                    </span>
                    <span className="pp-review-stars">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.comment && <p className="pp-review-text">{r.comment}</p>}
                  <span className="pp-review-date">
                    {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="pp-empty">Henüz değerlendirme yok. İlk yorumu siz yapın!</p>
          )}
          {isLoggedIn && <ReviewForm subdomain={subdomain!} onSubmitted={loadProfile} />}
        </section>
      </div>

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div className="pp-lightbox" onClick={() => setLightboxOpen(false)}>
          <img src={images[galleryIdx]} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="pp-lb-close" onClick={() => setLightboxOpen(false)}>
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                className="pp-lb-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIdx((galleryIdx - 1 + images.length) % images.length);
                }}
              >
                ‹
              </button>
              <button
                className="pp-lb-next"
                onClick={(e) => {
                  e.stopPropagation();
                  setGalleryIdx((galleryIdx + 1) % images.length);
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══ Sub-Components ══════════════════════════════════════════════════════════

function TrainerCard({ trainer }: { trainer: ProfileData['trainers'][0] }) {
  return (
    <Link to={`/trainer/${trainer.id}`} className="pp-trainer-card">
      <div className="pp-trainer-photo">
        {trainer.photoUrl ? (
          <img src={trainer.photoUrl} alt={trainer.name} />
        ) : (
          <span>{trainer.name.charAt(0)}</span>
        )}
      </div>
      <strong>{trainer.name}</strong>
      {Number(trainer.avgRating) > 0 && (
        <span className="pp-trainer-rating">★ {Number(trainer.avgRating).toFixed(1)}</span>
      )}
      {trainer.specializations.length > 0 && (
        <span className="pp-trainer-spec">{trainer.specializations.slice(0, 2).join(', ')}</span>
      )}
    </Link>
  );
}

function FavoriteBtn({ profileId }: { profileId: string }) {
  const { isFavorite, toggle } = useFavorite('club', profileId);
  return (
    <button className={`pp-action-btn ${isFavorite ? 'active' : ''}`} onClick={() => void toggle()}>
      {isFavorite ? '❤️' : '🤍'} {isFavorite ? 'Favorilerde' : 'Favoriye Ekle'}
    </button>
  );
}

function MessageBtn({ subdomain, large }: { subdomain: string; large?: boolean }) {
  const [sending, setSending] = useState(false);
  async function handleMsg() {
    setSending(true);
    try {
      await apiJson('/messages/conversations/club-by-subdomain', {
        method: 'POST',
        body: JSON.stringify({ subdomain }),
      });
      alert('Sohbet oluşturuldu! Mesajlar sekmesinden devam edebilirsiniz.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  }
  return (
    <button
      className={`pp-action-btn msg ${large ? 'large' : ''}`}
      onClick={handleMsg}
      disabled={sending}
    >
      💬 {large ? 'Kulübe Mesaj Gönder' : 'Mesaj'}
    </button>
  );
}

function ReviewForm({ subdomain, onSubmitted }: { subdomain: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiJson(`/clubs/${encodeURIComponent(subdomain)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || undefined }),
      });
      setDone(true);
      onSubmitted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yorum gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <div className="pp-review-done">✅ Değerlendirmeniz kaydedildi!</div>;

  return (
    <form className="pp-review-form" onSubmit={submit}>
      <div className="pp-review-stars-input">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRating(s)}
            className={s <= rating ? 'active' : ''}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Deneyiminizi paylaşın..."
        rows={2}
      />
      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? '...' : 'Değerlendir'}
      </button>
    </form>
  );
}

function PackageBuyBtn({ packageId }: { packageId: string }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!token)
    return (
      <Link to="/login" className="pp-buy-btn">
        Giriş Yap & Satın Al
      </Link>
    );
  return (
    <button
      className="pp-buy-btn"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await apiJson<{ checkoutUrl: string }>(`/v2/packages/${packageId}/checkout`, {
            method: 'POST',
            body: JSON.stringify({ userId: user?.id, guestEmail: user?.email }),
          });
          if (res.checkoutUrl) window.location.assign(res.checkoutUrl);
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Ödeme başlatılamadı');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? '...' : `💳 Satın Al`}
    </button>
  );
}

function BookingSection({ subdomain }: { subdomain: string }) {
  const { token } = useAuth();
  const [services, setServices] = useState<V2Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    apiJson<V2Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}`, { auth: false })
      .then(setServices)
      .catch(() => {});
    apiJson<Addon[]>(`/v2/addons?tenant=${encodeURIComponent(subdomain)}`, { auth: false })
      .then(setAddons)
      .catch(() => {});
  }, [subdomain]);

  const categories = [...new Set(services.map((s) => s.category))];
  const CATEGORY_META: Record<string, { icon: string; label: string }> = {
    personal_training: { icon: '🏋️', label: 'Personal Training' },
    massage: { icon: '💆', label: 'Masaj / Spa' },
    court_rental: { icon: '🎾', label: 'Kort Kiralama' },
    group_class: { icon: '🧘', label: 'Grup Dersi' },
    general: { icon: '📋', label: 'Genel' },
  };

  if (services.length === 0) return <p className="pp-empty">Henüz hizmet tanımlanmamış.</p>;
  if (!token)
    return (
      <div className="pp-login-prompt">
        <p>Rezervasyon yapmak için giriş yapın</p>
        <Link to="/login" className="btn-primary">
          Giriş Yap
        </Link>
      </div>
    );

  // Kategori seçilmediyse kartlar göster
  if (!selectedCategory) {
    return (
      <div className="bw-wizard">
        <p className="bw-step-title">Ne yapmak istiyorsunuz?</p>
        <div className="bw-categories">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat] || { icon: '📋', label: cat };
            return (
              <button key={cat} className="bw-cat-card" onClick={() => setSelectedCategory(cat)}>
                <span className="bw-cat-icon">{meta.icon}</span>
                <span className="bw-cat-label">{meta.label}</span>
                <span className="bw-cat-count">
                  {services.filter((s) => s.category === cat).length} hizmet
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Kategori seçildiyse, kategoriye özel wizard göster
  const catServices = services.filter((s) => s.category === selectedCategory);
  const needsParticipants = selectedCategory === 'massage' || selectedCategory === 'court_rental';

  return (
    <div className="bw-wizard">
      <button className="bw-back" onClick={() => setSelectedCategory('')}>
        ← Kategoriler
      </button>
      <CategoryWizard
        subdomain={subdomain}
        category={selectedCategory}
        categoryMeta={CATEGORY_META[selectedCategory] || { icon: '📋', label: selectedCategory }}
        services={catServices}
        addons={addons}
        needsParticipants={needsParticipants}
      />
    </div>
  );
}

// ═══ Kategori bazlı Wizard ═══════════════════════════════════════════════════

// ═══ Kategori bazlı Wizard ═══════════════════════════════════════════════════

function CategoryWizard({
  subdomain,
  category,
  categoryMeta,
  services,
  addons,
  needsParticipants,
}: {
  subdomain: string;
  category: string;
  categoryMeta: { icon: string; label: string };
  services: V2Service[];
  addons: Addon[];
  needsParticipants: boolean;
}) {
  const isMassage = category === 'massage';
  const therapists = services.filter((s) => s.providerType === 'trainer');
  const rooms = services.filter((s) => s.providerType !== 'trainer');
  const capacities = [...new Set(services.map((s) => s.capacity))].sort((a, b) => a - b);

  // Filters
  const [participants, setParticipants] = useState(capacities[0] || 1);
  const [selectedMasoz, setSelectedMasoz] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<V2Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [addonSelections, setAddonSelections] = useState<Record<string, number>>({});
  const [booking, setBooking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Spa Yönetimi → Hizmetler sekmesindeki masaj çeşitleri
  const [spaServices, setSpaServices] = useState<
    Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      durationMinutes: number;
      price: string | number;
      sessionCost: number;
    }>
  >([]);

  useEffect(() => {
    if (!isMassage) return;
    apiJson<
      Array<{
        id: string;
        name: string;
        description: string | null;
        category: string;
        durationMinutes: number;
        price: string | number;
        sessionCost: number;
      }>
    >(`/spa/services/public/${encodeURIComponent(subdomain)}`, { auth: false })
      .then((data) => {
        setSpaServices(data);
        // Varsayılan: "Classic Masaj"ı seç (yoksa ilk hizmet)
        if (data.length > 0) {
          const classic = data.find((s) => /classic/i.test(s.name));
          setSelectedType((prev) => prev || (classic?.id ?? data[0].id));
        }
      })
      .catch(() => setSpaServices([]));
  }, [isMassage, subdomain]);

  // Effective service — masöz seçildiyse masöz, oda seçildiyse oda, yoksa kapasiteye uygun ilk
  const effectiveServiceId =
    selectedMasoz ||
    selectedType ||
    (() => {
      if (isMassage) {
        const suitable = rooms.filter((r) => r.capacity >= participants);
        return suitable[0]?.id || therapists[0]?.id || '';
      }
      return services.filter((s) => s.capacity >= participants)[0]?.id || '';
    })();

  useEffect(() => {
    if (!selectedDate) return;

    // Masaj kategorisinde her zaman spa-rooms endpoint'i kullan
    // (selectedType artık spa_service ID — bilgi amaçlı, slot fetch'ini etkilemez)
    if (isMassage) {
      const params = new URLSearchParams({
        tenant: subdomain,
        date: selectedDate,
        participants: String(participants),
      });
      apiJson<{
        rooms: Array<{
          roomId: string;
          roomName: string;
          capacity: number;
          roomType: string;
          price: string;
          currency: string;
          timeSlots: Array<{
            roomSlotId: string;
            startTime: string;
            endTime: string;
            unitPrice: string;
            totalPrice: string;
            currency: string;
            isBookable: boolean;
            requiredTherapists: number;
            availableTherapists: Array<{ id: string; slotId: string; name: string }>;
          }>;
        }>;
        date: string;
      }>(`/v2/schedule/spa-rooms?${params}`, { auth: false })
        .then((data) => {
          const allSlots: V2Slot[] = [];
          for (const room of data.rooms || []) {
            for (const ts of room.timeSlots) {
              if (!ts.isBookable) continue;
              if (selectedMasoz && !ts.availableTherapists.some((t) => t.id === selectedMasoz))
                continue;

              const slotId = selectedMasoz
                ? ts.availableTherapists.find((t) => t.id === selectedMasoz)?.slotId ||
                  ts.roomSlotId
                : ts.roomSlotId;

              allSlots.push({
                id: slotId,
                serviceId: room.roomId,
                startTime: ts.startTime,
                endTime: ts.endTime,
                price: ts.totalPrice,
                remainingCapacity: ts.availableTherapists.length,
              });
            }
          }
          setSlots(allSlots);
        })
        .catch(() => setSlots([]));
      return;
    }

    // Diğer kategoriler için mevcut endpoint
    if (!effectiveServiceId) return;
    apiJson<V2Slot[]>(
      `/v2/schedule?tenant=${encodeURIComponent(subdomain)}&serviceId=${effectiveServiceId}&date=${selectedDate}`,
      { auth: false },
    )
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [
    subdomain,
    effectiveServiceId,
    selectedDate,
    isMassage,
    participants,
    selectedMasoz,
    selectedType,
  ]);

  const days = getWeekDays(weekOffset);
  const selectedSvc = services.find((s) => s.id === effectiveServiceId);
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const futureSlots = slots.filter(
    (s) => new Date(`${selectedDate}T${s.startTime}:00`) > new Date(),
  );

  async function proceedToCheckout() {
    if (!selectedSlotId) return;
    setBooking(true);
    const selected = Object.entries(addonSelections)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => ({ addonId: id, quantity }));
    try {
      const res = await apiJson<{ checkoutUrl: string }>('/v2/checkout', {
        method: 'POST',
        body: JSON.stringify({
          slotId: selectedSlotId,
          addons: selected.length > 0 ? selected : undefined,
        }),
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
      alert(err instanceof Error ? err.message : 'Hata');
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="bw-filter-view">
      {/* Filtreler */}
      <div className="bw-filters">
        {/* Kişi Sayısı */}
        {needsParticipants && capacities.length > 1 && (
          <div className="bw-filter-row">
            <span className="bw-filter-label">👥 Kişi:</span>
            <div className="bw-filter-chips">
              {capacities.map((n) => (
                <button
                  key={n}
                  className={`bw-chip ${participants === n ? 'active' : ''}`}
                  onClick={() => {
                    setParticipants(n);
                    setSelectedType('');
                    setSelectedSlotId(null);
                    setShowConfirm(false);
                  }}
                >
                  {n} Kişi
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Masaj Türü (Spa Yönetimi → Hizmetler — dropdown) */}
        {isMassage && spaServices.length > 0 && (
          <div className="bw-filter-row">
            <span className="bw-filter-label">🏠 Masaj Türü:</span>
            <select
              className="bw-select"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setSelectedSlotId(null);
                setShowConfirm(false);
              }}
            >
              <option value="">Tümü</option>
              {spaServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.durationMinutes}dk · {s.price}₺ · {s.sessionCost} kredi
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Masöz (sadece masaj kategorisinde) */}
        {isMassage && therapists.length > 0 && (
          <div className="bw-filter-row">
            <span className="bw-filter-label">💆 Masöz:</span>
            <div className="bw-filter-chips">
              <button
                className={`bw-chip ${!selectedMasoz ? 'active' : ''}`}
                onClick={() => {
                  setSelectedMasoz('');
                  setSelectedSlotId(null);
                  setShowConfirm(false);
                }}
              >
                Fark Etmez
              </button>
              {therapists.map((t) => (
                <button
                  key={t.id}
                  className={`bw-chip ${selectedMasoz === t.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMasoz(t.id);
                    setSelectedType('');
                    setSelectedSlotId(null);
                    setShowConfirm(false);
                  }}
                >
                  {t.providerName || t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PT/Kort: Eğitmen/Hizmet seçimi */}
        {!isMassage && services.length > 1 && (
          <div className="bw-filter-row">
            <span className="bw-filter-label">
              {category === 'personal_training' ? '🏋️ Eğitmen:' : '🎯 Hizmet:'}
            </span>
            <div className="bw-filter-chips">
              {services
                .filter((s) => !needsParticipants || s.capacity >= participants)
                .map((s) => (
                  <button
                    key={s.id}
                    className={`bw-chip ${effectiveServiceId === s.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedType(s.id);
                      setSelectedMasoz('');
                      setSelectedSlotId(null);
                      setShowConfirm(false);
                    }}
                  >
                    {s.providerName || s.name} · {s.price}₺
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Tarih */}
      <div className="bw-date-section">
        <div className="pp-week-nav">
          <button
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
          >
            ←
          </button>
          <span>{weekOffset === 0 ? 'Bu Hafta' : `${weekOffset + 1}. Hafta`}</span>
          <button
            onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
            disabled={weekOffset >= 3}
          >
            →
          </button>
        </div>
        <div className="bw-date-grid">
          {days.map((d) => (
            <button
              key={d.value}
              className={`bw-date-card ${selectedDate === d.value ? 'active' : ''}`}
              onClick={() => {
                setSelectedDate(d.value);
                setSelectedSlotId(null);
                setShowConfirm(false);
              }}
            >
              <span className="bw-date-day">{d.dayName}</span>
              <span className="bw-date-num">{d.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Müsait Saatler */}
      <div className="bw-time-section">
        <p className="bw-filter-label">🕐 Müsait Saatler:</p>
        {futureSlots.length === 0 ? (
          <p className="pp-empty">Bu tarihte müsait saat yok</p>
        ) : (
          <div className="bw-slots-grid">
            {futureSlots.map((s) => (
              <button
                key={s.id}
                className={`bw-slot-card ${selectedSlotId === s.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedSlotId(s.id);
                  setShowConfirm(true);
                }}
              >
                <span className="bw-slot-time">
                  {s.startTime}-{s.endTime}
                </span>
                <span className="bw-slot-price">{s.price}₺</span>
                <span className="bw-slot-credit">veya 1 kredi</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Onay paneli (saat seçildiğinde) */}
      {showConfirm && selectedSlot && (
        <div className="order-summary-panel" style={{ marginTop: 16 }}>
          <div className="order-summary-header">
            <h3>📋 Rezervasyon Özeti</h3>
          </div>
          <div className="order-summary-details">
            <div className="order-detail-row">
              <span className="order-detail-icon">{categoryMeta.icon}</span>
              <div className="order-detail-info">
                <strong>{selectedSvc?.providerName || selectedSvc?.name || 'Otomatik'}</strong>
                <p>{selectedSvc?.durationMinutes || 60}dk</p>
              </div>
              <span className="order-detail-price">{selectedSlot.price}₺</span>
            </div>
            <div className="order-detail-row">
              <span className="order-detail-icon">📅</span>
              <div className="order-detail-info">
                <strong>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </strong>
                <p>
                  {selectedSlot.startTime} - {selectedSlot.endTime}
                </p>
              </div>
            </div>
            {needsParticipants && (
              <div className="order-detail-row">
                <span className="order-detail-icon">👥</span>
                <div className="order-detail-info">
                  <strong>{participants} Kişi</strong>
                </div>
              </div>
            )}
            {selectedMasoz && (
              <div className="order-detail-row">
                <span className="order-detail-icon">💆</span>
                <div className="order-detail-info">
                  <strong>{therapists.find((t) => t.id === selectedMasoz)?.providerName}</strong>
                </div>
              </div>
            )}
          </div>
          {addons.length > 0 && (
            <div className="order-addons-section">
              <h4>🛒 Ek Hizmetler</h4>
              <div className="addon-list">
                {addons.map((a) => (
                  <div key={a.id} className="addon-item">
                    <div>
                      <strong>{a.name}</strong>
                      <span className="addon-price">+{a.price}₺</span>
                    </div>
                    <div className="addon-qty">
                      <button
                        onClick={() =>
                          setAddonSelections((p) => ({
                            ...p,
                            [a.id]: Math.max(0, (p[a.id] || 0) - 1),
                          }))
                        }
                        disabled={!addonSelections[a.id]}
                      >
                        −
                      </button>
                      <span>{addonSelections[a.id] || 0}</span>
                      <button
                        onClick={() =>
                          setAddonSelections((p) => ({ ...p, [a.id]: (p[a.id] || 0) + 1 }))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="addon-actions">
            <button
              className="btn-primary"
              onClick={proceedToCheckout}
              disabled={booking}
              style={{ flex: 1 }}
            >
              {booking ? 'Yönlendiriliyor...' : '💳 Ödemeye Geç'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Campaign Buy Button ─────────────────────────────────────────────────────

function CampaignBuyBtn({ campaignId }: { campaignId: string; price: string | null }) {
  return (
    <Link
      to={`/campaign/${campaignId}`}
      className="pp-buy-btn"
      style={{ marginTop: 8, display: 'block', textAlign: 'center' }}
    >
      🔍 Detayları Gör
    </Link>
  );
}

// ─── Event Buy Button ────────────────────────────────────────────────────────

function EventBuyBtn({ eventId, price }: { eventId: string; price: string }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!token)
    return (
      <Link to="/login" className="pp-buy-btn" style={{ margin: '8px 12px 12px' }}>
        Giriş Yap & Katıl
      </Link>
    );

  return (
    <button
      className="pp-buy-btn"
      style={{ margin: '0 12px 12px' }}
      disabled={loading}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLoading(true);
        try {
          const res = await apiJson<{ checkoutUrl: string }>(`/v2/events/${eventId}/checkout`, {
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
          setLoading(false);
        }
      }}
    >
      {loading ? '...' : `💳 Katıl (${price}₺)`}
    </button>
  );
}

// ─── Accordion Component ─────────────────────────────────────────────────────

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="pp-accordion">
      <button
        className={`pp-accordion-header ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <span className="pp-accordion-arrow">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="pp-accordion-body">{children}</div>}
    </div>
  );
}

// ─── Step 4: Oda veya Masöz Seçimi ──────────────────────────────────────────
