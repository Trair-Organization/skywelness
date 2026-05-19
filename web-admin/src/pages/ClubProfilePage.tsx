import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { useFavorite } from '../hooks/useFavorite';

// ═══ Unified Booking Component (v2 API) ═══
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
};
type V2Slot = {
  id: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  price: string;
  remainingCapacity: number;
};

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

function ProviderBooking({
  subdomain,
  category,
  title,
}: {
  subdomain: string;
  category: string;
  title: string;
}) {
  const { token } = useAuth();
  const [services, setServices] = useState<V2Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<V2Slot[]>([]);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  // Addon state
  const [addons, setAddons] = useState<Array<{ id: string; name: string; price: string }>>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [addonSelections, setAddonSelections] = useState<Record<string, number>>({});
  const [showAddonStep, setShowAddonStep] = useState(false);

  // Hizmetleri yükle
  useEffect(() => {
    apiJson<V2Service[]>(
      `/v2/services?tenant=${encodeURIComponent(subdomain)}&category=${category}`,
      { auth: false },
    )
      .then((list) => {
        setServices(list);
        if (list.length > 0 && !selectedService) setSelectedService(list[0].id);
      })
      .catch(() => {});
  }, [subdomain, category, selectedService]);

  // Slotları yükle
  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    apiJson<V2Slot[]>(
      `/v2/schedule?tenant=${encodeURIComponent(subdomain)}&serviceId=${selectedService}&date=${selectedDate}`,
      { auth: false },
    )
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [subdomain, selectedService, selectedDate]);

  // Addon'ları yükle
  useEffect(() => {
    apiJson<Array<{ id: string; name: string; price: string }>>(
      `/v2/addons?tenant=${encodeURIComponent(subdomain)}`,
      { auth: false },
    )
      .then(setAddons)
      .catch(() => setAddons([]));
  }, [subdomain]);

  const days = getWeekDays(weekOffset);

  function handleSlotSelect(slotId: string) {
    if (!token) return;
    setSelectedSlotId(slotId);
    if (addons.length > 0) {
      setShowAddonStep(true);
      setAddonSelections({});
    } else {
      void proceedToCheckout(slotId, []);
    }
  }

  async function proceedToCheckout(
    slotId: string,
    selectedAddons: Array<{ addonId: string; quantity: number }>,
  ) {
    setBooking(true);
    setShowAddonStep(false);
    try {
      const res = await apiJson<{ checkoutUrl: string; sessionId: string }>('/v2/checkout', {
        method: 'POST',
        body: JSON.stringify({
          slotId,
          addons: selectedAddons.length > 0 ? selectedAddons : undefined,
        }),
      });
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
      } else {
        alert('Ödeme başlatılamadı');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rezervasyon başarısız');
    } finally {
      setBooking(false);
    }
  }

  function confirmAddons() {
    const selected = Object.entries(addonSelections)
      .filter(([, qty]) => qty > 0)
      .map(([addonId, quantity]) => ({ addonId, quantity }));
    void proceedToCheckout(selectedSlotId!, selected);
  }

  if (services.length === 0) return null;

  return (
    <section className="profile-section">
      <h2>{title}</h2>

      {/* Dropdown: Eğitmen/Masöz seçimi */}
      <select
        className="provider-select"
        value={selectedService}
        onChange={(e) => {
          setSelectedService(e.target.value);
          setBooked(null);
        }}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.providerName || s.name} — {s.price}₺/{s.durationMinutes}dk
          </option>
        ))}
      </select>

      {/* Hafta navigasyonu */}
      <div className="week-nav">
        <button
          className="week-nav-btn"
          onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
          disabled={weekOffset === 0}
        >
          ← Önceki
        </button>
        <span className="week-nav-label">
          {weekOffset === 0
            ? 'Bu Hafta'
            : weekOffset === 1
              ? 'Gelecek Hafta'
              : `${weekOffset + 1}. Hafta`}
        </span>
        <button
          className="week-nav-btn"
          onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
          disabled={weekOffset >= 3}
        >
          Sonraki →
        </button>
      </div>

      {/* Gün seçimi */}
      <div className="date-tabs">
        {days.map((d) => (
          <button
            key={d.value}
            className={`date-tab ${selectedDate === d.value ? 'active' : ''}`}
            onClick={() => {
              setSelectedDate(d.value);
              setBooked(null);
            }}
          >
            <span className="date-day">{d.dayName}</span>
            <span className="date-num">{d.label}</span>
          </button>
        ))}
      </div>

      {/* Slotlar */}
      {!token ? (
        <div className="login-required-box">
          <p>Müsait saatleri görmek ve randevu almak için üye olmanız gerekiyor.</p>
          <div className="login-required-actions">
            <Link to="/register" className="btn-primary">
              Üye Ol
            </Link>
            <Link to="/login" className="btn-outline">
              Giriş Yap
            </Link>
          </div>
        </div>
      ) : booked ? (
        <div className="event-joined-box">
          <span>✅</span>
          <p>Rezervasyon talebiniz oluşturuldu!</p>
        </div>
      ) : slots.length === 0 ? (
        <p className="no-slots">Bu tarihte müsait saat yok</p>
      ) : (
        <div className="slots-grid">
          {slots.map((s) => (
            <button
              key={s.id}
              className="slot-btn"
              onClick={() => handleSlotSelect(s.id)}
              disabled={booking}
            >
              <span className="slot-time">
                {s.startTime} - {s.endTime}
              </span>
              <span className="slot-price">{s.price}₺</span>
            </button>
          ))}
        </div>
      )}

      {/* Addon Seçim Adımı */}
      {showAddonStep && (
        <div className="addon-step">
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: 12 }}>
            🛒 Ek Hizmet Eklemek İster misiniz?
          </h3>
          <div className="addon-list">
            {addons.map((addon) => (
              <div key={addon.id} className="addon-item">
                <div>
                  <strong>{addon.name}</strong>
                  <span className="addon-price">+{addon.price}₺</span>
                </div>
                <div className="addon-qty">
                  <button
                    onClick={() =>
                      setAddonSelections((prev) => ({
                        ...prev,
                        [addon.id]: Math.max(0, (prev[addon.id] || 0) - 1),
                      }))
                    }
                    disabled={(addonSelections[addon.id] || 0) === 0}
                  >
                    −
                  </button>
                  <span>{addonSelections[addon.id] || 0}</span>
                  <button
                    onClick={() =>
                      setAddonSelections((prev) => ({
                        ...prev,
                        [addon.id]: (prev[addon.id] || 0) + 1,
                      }))
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="addon-actions">
            <button
              className="btn-primary"
              onClick={confirmAddons}
              disabled={booking}
              style={{ flex: 1 }}
            >
              {booking ? 'Yönlendiriliyor...' : '💳 Ödemeye Geç'}
            </button>
            <button
              className="btn-outline"
              onClick={() => void proceedToCheckout(selectedSlotId!, [])}
              disabled={booking}
              style={{ flex: 1 }}
            >
              Ek Hizmet İstemiyorum
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

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
  events: Array<{
    id: string;
    title: string;
    startsAt: string;
    imageUrl: string | null;
    coachName: string | null;
  }>;
  metrics: {
    memberCount: number;
    totalBookings: number;
    trainerCount: number;
  };
};

export function ClubProfilePage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  useAuth(); // context needed by ProviderBooking children
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [clubCampaigns, setClubCampaigns] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      discountKind: string;
      discountValue: string;
      originalPrice: string | null;
      discountedPrice: string | null;
      imageUrl: string | null;
      endsAt: string;
    }>
  >([]);

  const loadProfile = useCallback(async () => {
    if (!subdomain) return;
    try {
      const data = await apiJson<ProfileData>(`/tenants/${encodeURIComponent(subdomain)}/profile`, {
        auth: false,
      });
      setProfile(data);
      // Kulübe ait aktif kampanyaları yükle
      try {
        const camps = await apiJson<typeof clubCampaigns>(
          `/campaigns/public?tenantSubdomain=${encodeURIComponent(subdomain)}&limit=10`,
          { auth: false },
        );
        setClubCampaigns(camps);
      } catch {
        /* ignore */
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

  if (loading)
    return (
      <div className="public-shell">
        <div className="profile-loading">Yükleniyor...</div>
      </div>
    );
  if (!profile)
    return (
      <div className="public-shell">
        <div className="profile-loading">Profil bulunamadı</div>
      </div>
    );

  const images =
    profile.galleryImages.length > 0
      ? profile.galleryImages
      : profile.coverImageUrl
        ? [profile.coverImageUrl]
        : [];

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">
            Giriş Yap
          </Link>
        </div>
      </nav>

      <div className="profile-page">
        {/* Galeri */}
        {images.length > 0 ? (
          <div className="profile-gallery">
            <img src={images[galleryIdx]} alt={profile.name} className="profile-gallery-img" />
            {images.length > 1 && (
              <>
                <button
                  className="gallery-arrow gallery-prev"
                  onClick={() => setGalleryIdx((galleryIdx - 1 + images.length) % images.length)}
                >
                  ‹
                </button>
                <button
                  className="gallery-arrow gallery-next"
                  onClick={() => setGalleryIdx((galleryIdx + 1) % images.length)}
                >
                  ›
                </button>
                <div className="gallery-dots">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`gallery-dot ${i === galleryIdx ? 'active' : ''}`}
                      onClick={() => setGalleryIdx(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="profile-gallery profile-gallery-ph">
            <span>{profile.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        {/* Header */}
        <div className="profile-header">
          <div className="profile-header-info">
            {profile.logoUrl && <img src={profile.logoUrl} alt="" className="profile-logo" />}
            <div>
              <h1>{profile.name}</h1>
              {profile.location && <p className="profile-location">📍 {profile.location}</p>}
            </div>
            {profile.avgRating !== '0.00' && (
              <span className="profile-rating">★ {Number(profile.avgRating).toFixed(1)}</span>
            )}
            <FavoriteButton targetType="club" targetId={profile.id} />
          </div>
          <div className="profile-metrics">
            {profile.metrics.memberCount > 0 && (
              <div className="metric">
                <strong>{profile.metrics.memberCount}</strong>
                <span>Üye</span>
              </div>
            )}
            {profile.metrics.totalBookings > 0 && (
              <div className="metric">
                <strong>{profile.metrics.totalBookings}</strong>
                <span>Rezervasyon</span>
              </div>
            )}
            {profile.metrics.trainerCount > 0 && (
              <div className="metric">
                <strong>{profile.metrics.trainerCount}</strong>
                <span>Eğitmen</span>
              </div>
            )}
          </div>
        </div>

        {/* Hakkında */}
        {profile.description && (
          <section className="profile-section">
            <h2>📝 Hakkımızda</h2>
            <p>{profile.description}</p>
          </section>
        )}

        {/* Hizmetler */}
        {profile.services.length > 0 && (
          <section className="profile-section">
            <h2>🎯 Hizmetler</h2>
            <div className="profile-chips">
              {profile.services.map((s, i) => (
                <span key={i} className="profile-chip">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Paketler */}
        {profile.packages.length > 0 && (
          <section className="profile-section">
            <h2>💎 Paketler & Fiyatlar</h2>
            <div className="packages-grid">
              {profile.packages.map((pkg) => (
                <div key={pkg.id} className="package-card">
                  <h3>{pkg.name}</h3>
                  <p>
                    {pkg.sessionCount} seans · {pkg.validityDays} gün geçerli
                  </p>
                  <p className="package-type">
                    {pkg.sessionType === 'personal_training' ? '🏋️ Personal Training' : '💆 Masaj'}
                  </p>
                  <div className="package-price">
                    <strong>{pkg.price}₺</strong>
                    <span>{Math.round(parseFloat(pkg.price) / pkg.sessionCount)}₺/seans</span>
                  </div>
                  <PackageBuyButton packageId={pkg.id} price={pkg.price} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🏋️ PT Randevu */}
        <ProviderBooking
          subdomain={subdomain!}
          category="personal_training"
          title="🏋️ PT Randevu — Eğitmen Seç"
        />

        {/* 💆 Masaj Randevu */}
        <ProviderBooking
          subdomain={subdomain!}
          category="massage"
          title="💆 Masaj Randevu — Masöz Seç"
        />

        {/* 🎾 Kort Kiralama (O'Padel gibi) */}
        <ProviderBooking
          subdomain={subdomain!}
          category="court_rental"
          title="🎾 Kort Rezervasyonu"
        />

        {/* Eğitmenler */}
        {profile.trainers.filter((t) => (t.offersSessionTypes || []).includes('personal_training'))
          .length > 0 && (
          <section className="profile-section">
            <h2>🏋️ Eğitmenler</h2>
            <div className="trainers-grid">
              {profile.trainers
                .filter((t) => (t.offersSessionTypes || []).includes('personal_training'))
                .map((t) => (
                  <Link key={t.id} to={`/trainer/${t.id}`} className="trainer-profile-card">
                    <div className="trainer-profile-photo">
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt={t.name} />
                      ) : (
                        <span>{t.name.charAt(0)}</span>
                      )}
                    </div>
                    <h3>{t.name}</h3>
                    {t.avgRating !== '0.00' && (
                      <p className="trainer-rating">★ {Number(t.avgRating).toFixed(1)}</p>
                    )}
                    {t.specializations.length > 0 && (
                      <p className="trainer-specs">{t.specializations.slice(0, 2).join(', ')}</p>
                    )}
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* Masözler */}
        {profile.trainers.filter((t) => (t.offersSessionTypes || []).includes('massage')).length >
          0 && (
          <section className="profile-section">
            <h2>💆 Masözler</h2>
            <div className="trainers-grid">
              {profile.trainers
                .filter((t) => (t.offersSessionTypes || []).includes('massage'))
                .map((t) => (
                  <Link key={t.id} to={`/trainer/${t.id}`} className="trainer-profile-card">
                    <div className="trainer-profile-photo">
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt={t.name} />
                      ) : (
                        <span>{t.name.charAt(0)}</span>
                      )}
                    </div>
                    <h3>{t.name}</h3>
                    {t.avgRating !== '0.00' && (
                      <p className="trainer-rating">★ {Number(t.avgRating).toFixed(1)}</p>
                    )}
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* Kampanyalar */}
        {clubCampaigns.length > 0 && (
          <section className="profile-section">
            <h2>🔥 Kampanyalar</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {clubCampaigns.map((c) => {
                const discountText =
                  c.discountKind === 'percentage' ? `%${c.discountValue}` : `₺${c.discountValue}`;
                return (
                  <div
                    key={c.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: '#fff',
                    }}
                  >
                    {c.imageUrl && (
                      <img
                        src={c.imageUrl}
                        alt=""
                        style={{ width: '100%', height: 100, objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ padding: '12px 14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
                          {c.title}
                        </h4>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#dcfce7',
                            color: '#166534',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {discountText}
                        </span>
                      </div>
                      {c.description && (
                        <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#6b7280' }}>
                          {c.description.slice(0, 60)}
                        </p>
                      )}
                      {c.discountedPrice && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {c.originalPrice && (
                            <span
                              style={{
                                textDecoration: 'line-through',
                                color: '#9ca3af',
                                fontSize: '0.8rem',
                              }}
                            >
                              ₺{parseFloat(c.originalPrice).toLocaleString('tr-TR')}
                            </span>
                          )}
                          <span style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                            ₺{parseFloat(c.discountedPrice).toLocaleString('tr-TR')}
                          </span>
                        </div>
                      )}
                      <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: '#9ca3af' }}>
                        ⏰ {new Date(c.endsAt).toLocaleDateString('tr-TR')}'e kadar
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Yorumlar */}
        <ClubReviewsSection subdomain={subdomain!} />
      </div>
    </div>
  );
}

// ─── Club Reviews Section ────────────────────────────────────────────────────

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; photoUrl: string | null };
};

function ClubReviewsSection({ subdomain }: { subdomain: string }) {
  const { token } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState('0');
  const [reviewCount, setReviewCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      apiJson<{ reviews: ReviewItem[]; total: number; avgRating: string; reviewCount: number }>(
        `/clubs/${encodeURIComponent(subdomain)}/reviews?limit=10`,
        { auth: false },
      )
        .then((data) => {
          setReviews(data.reviews);
          setTotal(data.total);
          setAvgRating(data.avgRating);
          setReviewCount(data.reviewCount);
        })
        .catch(() => {});
    });
  }, [subdomain, submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      await apiJson(`/clubs/${encodeURIComponent(subdomain)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: newRating, comment: newComment || undefined }),
      });
      setSubmitted(true);
      setShowForm(false);
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yorum gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <section className="profile-section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2>⭐ Değerlendirmeler</h2>
        {token && !submitted && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: 'rgba(56,189,248,0.12)',
              border: '1px solid rgba(56,189,248,0.3)',
              color: '#38bdf8',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            {showForm ? 'İptal' : '✍️ Yorum Yap'}
          </button>
        )}
      </div>

      {/* Özet */}
      {reviewCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>
              {Number(avgRating).toFixed(1)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{reviewCount} değerlendirme</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const pct = total > 0 ? (count / Math.min(total, reviews.length)) * 100 : 0;
              return (
                <div
                  key={star}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                  }}
                >
                  <span>{star}★</span>
                  <div
                    style={{
                      width: 60,
                      height: 6,
                      background: 'rgba(148,163,184,0.15)',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: '#fbbf24',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Yorum Formu */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: 20,
            padding: 16,
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.15)',
            background: 'rgba(20,20,30,0.5)',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: '#94a3b8',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Puanınız
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewRating(s)}
                  style={{
                    fontSize: '1.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: s <= newRating ? '#fbbf24' : '#475569',
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                color: '#94a3b8',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              Yorumunuz (opsiyonel)
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Deneyiminizi paylaşın..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(20,20,20,0.8)',
                color: '#e2e8f0',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>
          {error && (
            <p style={{ color: '#f87171', fontSize: '0.82rem', marginBottom: 8 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {submitting ? 'Gönderiliyor...' : 'Değerlendirmeyi Gönder'}
          </button>
        </form>
      )}

      {submitted && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <p style={{ color: '#10b981', fontWeight: 600, margin: 0 }}>
            ✅ Değerlendirmeniz kaydedildi!
          </p>
        </div>
      )}

      {/* Yorum Listesi */}
      {reviews.length === 0 && !showForm && (
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Henüz değerlendirme yapılmamış. İlk yorumu siz yapın!
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reviews.map((r) => (
          <div
            key={r.id}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.1)',
              background: 'rgba(20,20,30,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(56,189,248,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#38bdf8',
                  }}
                >
                  {r.user.firstName.charAt(0)}
                  {r.user.lastName.charAt(0)}
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0' }}>
                  {r.user.firstName} {r.user.lastName}
                </span>
              </div>
              <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>
                {stars(r.rating)}
              </span>
            </div>
            {r.comment && (
              <p
                style={{
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  margin: '0 0 4px',
                  lineHeight: 1.5,
                }}
              >
                {r.comment}
              </p>
            )}
            <span style={{ fontSize: '0.72rem', color: '#475569' }}>
              {new Date(r.createdAt).toLocaleDateString('tr-TR')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Favorite Button ─────────────────────────────────────────────────────────

function FavoriteButton({
  targetType,
  targetId,
}: {
  targetType: 'club' | 'trainer';
  targetId: string;
}) {
  const { isFavorite, toggle, loading, isLoggedIn } = useFavorite(targetType, targetId);
  if (!isLoggedIn) return null;
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={loading}
      style={{
        background: isFavorite ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.1)',
        border: `1px solid ${isFavorite ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.2)'}`,
        borderRadius: 10,
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.85rem',
        fontWeight: 700,
        color: isFavorite ? '#ef4444' : '#94a3b8',
        transition: 'all 0.2s',
        marginLeft: 'auto',
      }}
      aria-label={isFavorite ? 'Favorilerden kaldır' : 'Favorilere ekle'}
    >
      {isFavorite ? '❤️' : '🤍'} {isFavorite ? 'Favorilerde' : 'Favorilere Ekle'}
    </button>
  );
}

// ─── Package Buy Button ──────────────────────────────────────────────────────

function PackageBuyButton({ packageId, price }: { packageId: string; price: string }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const commissionRate = 0.15;
  const kapora = (parseFloat(price) * commissionRate).toFixed(0);

  async function handleBuy() {
    setLoading(true);
    try {
      const res = await apiJson<{ checkoutUrl: string }>(`/v2/packages/${packageId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          guestEmail: user?.email,
        }),
      });
      if (res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ödeme başlatılamadı');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ marginTop: 10 }}>
        <Link
          to="/login"
          className="btn-primary"
          style={{ display: 'block', textAlign: 'center', padding: '0.6rem', fontSize: '0.82rem' }}
        >
          Satın Almak İçin Giriş Yap
        </Link>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="btn-primary"
        style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
      >
        {loading ? 'Yönlendiriliyor...' : `💳 Satın Al (Kapora: ${kapora}₺)`}
      </button>
      <p style={{ margin: '4px 0 0', fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
        Kalan tutar kulüpte ödenecek
      </p>
    </div>
  );
}
