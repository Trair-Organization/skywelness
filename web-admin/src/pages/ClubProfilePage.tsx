import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

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

function ProviderBooking({ subdomain, category, title }: { subdomain: string; category: string; title: string }) {
  const { token } = useAuth();
  const [services, setServices] = useState<V2Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<V2Slot[]>([]);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);

  // Hizmetleri yükle
  useEffect(() => {
    apiJson<V2Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}&category=${category}`, { auth: false })
      .then(list => {
        setServices(list);
        if (list.length > 0 && !selectedService) setSelectedService(list[0].id);
      })
      .catch(() => {});
  }, [subdomain, category, selectedService]);

  // Slotları yükle
  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    apiJson<V2Slot[]>(`/v2/schedule?tenant=${encodeURIComponent(subdomain)}&serviceId=${selectedService}&date=${selectedDate}`, { auth: false })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [subdomain, selectedService, selectedDate]);

  const days = getWeekDays(weekOffset);

  async function handleBook(slotId: string) {
    if (!token) return;
    setBooking(true);
    try {
      await apiJson('/v2/appointments', { method: 'POST', body: JSON.stringify({ slotId }) });
      setBooked(slotId);
      setSlots(prev => prev.filter(s => s.id !== slotId));
    } catch (err) { alert(err instanceof Error ? err.message : 'Rezervasyon başarısız'); }
    finally { setBooking(false); }
  }

  if (services.length === 0) return null;

  return (
    <section className="profile-section">
      <h2>{title}</h2>

      {/* Dropdown: Eğitmen/Masöz seçimi */}
      <select
        className="provider-select"
        value={selectedService}
        onChange={(e) => { setSelectedService(e.target.value); setBooked(null); }}
      >
        {services.map(s => (
          <option key={s.id} value={s.id}>{s.providerName || s.name} — {s.price}₺/{s.durationMinutes}dk</option>
        ))}
      </select>

      {/* Hafta navigasyonu */}
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}>← Önceki</button>
        <span className="week-nav-label">
          {weekOffset === 0 ? 'Bu Hafta' : weekOffset === 1 ? 'Gelecek Hafta' : `${weekOffset + 1}. Hafta`}
        </span>
        <button className="week-nav-btn" onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))} disabled={weekOffset >= 3}>Sonraki →</button>
      </div>

      {/* Gün seçimi */}
      <div className="date-tabs">
        {days.map(d => (
          <button key={d.value} className={`date-tab ${selectedDate === d.value ? 'active' : ''}`} onClick={() => { setSelectedDate(d.value); setBooked(null); }}>
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
            <Link to="/register" className="btn-primary">Üye Ol</Link>
            <Link to="/login" className="btn-outline">Giriş Yap</Link>
          </div>
        </div>
      ) : booked ? (
        <div className="event-joined-box"><span>✅</span><p>Rezervasyon talebiniz oluşturuldu!</p></div>
      ) : slots.length === 0 ? (
        <p className="no-slots">Bu tarihte müsait saat yok</p>
      ) : (
        <div className="slots-grid">
          {slots.map(s => (
            <button key={s.id} className="slot-btn" onClick={() => handleBook(s.id)} disabled={booking}>
              <span className="slot-time">{s.startTime} - {s.endTime}</span>
              <span className="slot-price">{s.price}₺</span>
            </button>
          ))}
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

  const loadProfile = useCallback(async () => {
    if (!subdomain) return;
    try {
      const data = await apiJson<ProfileData>(`/tenants/${encodeURIComponent(subdomain)}/profile`, { auth: false });
      setProfile(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [subdomain]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  if (loading) return <div className="public-shell"><div className="profile-loading">Yükleniyor...</div></div>;
  if (!profile) return <div className="public-shell"><div className="profile-loading">Profil bulunamadı</div></div>;

  const images = profile.galleryImages.length > 0 ? profile.galleryImages : profile.coverImageUrl ? [profile.coverImageUrl] : [];

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="profile-page">
        {/* Galeri */}
        {images.length > 0 ? (
          <div className="profile-gallery">
            <img src={images[galleryIdx]} alt={profile.name} className="profile-gallery-img" />
            {images.length > 1 && (
              <>
                <button className="gallery-arrow gallery-prev" onClick={() => setGalleryIdx((galleryIdx - 1 + images.length) % images.length)}>‹</button>
                <button className="gallery-arrow gallery-next" onClick={() => setGalleryIdx((galleryIdx + 1) % images.length)}>›</button>
                <div className="gallery-dots">
                  {images.map((_, i) => (
                    <span key={i} className={`gallery-dot ${i === galleryIdx ? 'active' : ''}`} onClick={() => setGalleryIdx(i)} />
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
          </div>
          <div className="profile-metrics">
            {profile.metrics.memberCount > 0 && <div className="metric"><strong>{profile.metrics.memberCount}</strong><span>Üye</span></div>}
            {profile.metrics.totalBookings > 0 && <div className="metric"><strong>{profile.metrics.totalBookings}</strong><span>Rezervasyon</span></div>}
            {profile.metrics.trainerCount > 0 && <div className="metric"><strong>{profile.metrics.trainerCount}</strong><span>Eğitmen</span></div>}
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
            <div className="profile-chips">{profile.services.map((s, i) => <span key={i} className="profile-chip">{s}</span>)}</div>
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
                  <p>{pkg.sessionCount} seans · {pkg.validityDays} gün geçerli</p>
                  <p className="package-type">{pkg.sessionType === 'personal_training' ? '🏋️ Personal Training' : '💆 Masaj'}</p>
                  <div className="package-price">
                    <strong>{pkg.price}₺</strong>
                    <span>{Math.round(parseFloat(pkg.price) / pkg.sessionCount)}₺/seans</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🏋️ PT Randevu */}
        <ProviderBooking subdomain={subdomain!} category="personal_training" title="🏋️ PT Randevu — Eğitmen Seç" />

        {/* 💆 Masaj Randevu */}
        <ProviderBooking subdomain={subdomain!} category="massage" title="💆 Masaj Randevu — Masöz Seç" />

        {/* 🎾 Kort Kiralama (O'Padel gibi) */}
        <ProviderBooking subdomain={subdomain!} category="court_rental" title="🎾 Kort Rezervasyonu" />

        {/* Eğitmenler */}
        {profile.trainers.filter(t => (t.offersSessionTypes || []).includes('personal_training')).length > 0 && (
          <section className="profile-section">
            <h2>🏋️ Eğitmenler</h2>
            <div className="trainers-grid">
              {profile.trainers.filter(t => (t.offersSessionTypes || []).includes('personal_training')).map((t) => (
                <Link key={t.id} to={`/trainer/${t.id}`} className="trainer-profile-card">
                  <div className="trainer-profile-photo">
                    {t.photoUrl ? <img src={t.photoUrl} alt={t.name} /> : <span>{t.name.charAt(0)}</span>}
                  </div>
                  <h3>{t.name}</h3>
                  {t.avgRating !== '0.00' && <p className="trainer-rating">★ {Number(t.avgRating).toFixed(1)}</p>}
                  {t.specializations.length > 0 && (
                    <p className="trainer-specs">{t.specializations.slice(0, 2).join(', ')}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Masözler */}
        {profile.trainers.filter(t => (t.offersSessionTypes || []).includes('massage')).length > 0 && (
          <section className="profile-section">
            <h2>💆 Masözler</h2>
            <div className="trainers-grid">
              {profile.trainers.filter(t => (t.offersSessionTypes || []).includes('massage')).map((t) => (
                <Link key={t.id} to={`/trainer/${t.id}`} className="trainer-profile-card">
                  <div className="trainer-profile-photo">
                    {t.photoUrl ? <img src={t.photoUrl} alt={t.name} /> : <span>{t.name.charAt(0)}</span>}
                  </div>
                  <h3>{t.name}</h3>
                  {t.avgRating !== '0.00' && <p className="trainer-rating">★ {Number(t.avgRating).toFixed(1)}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
