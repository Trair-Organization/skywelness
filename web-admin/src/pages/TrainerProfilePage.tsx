import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type LegacySlot = { id: string; date: string; startTime: string; endTime: string };

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

function ProviderSchedule({
  subdomain,
  providerId,
  trainerSlug,
}: {
  subdomain: string;
  providerId: string;
  trainerSlug: string;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [legacySlots, setLegacySlots] = useState<LegacySlot[]>([]);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  const days = getWeekDays(weekOffset);

  useEffect(() => {
    // Eğitmen panelinde / kulüp PT yönetiminde oluşturulan availability slot'ları
    apiJson<LegacySlot[]>(
      `/trainers/${encodeURIComponent(trainerSlug)}/slots?date=${selectedDate}`,
      { auth: false },
    )
      .then(setLegacySlots)
      .catch(() => setLegacySlots([]));
  }, [subdomain, providerId, trainerSlug, selectedDate]);

  async function handleBookLegacy(slot: LegacySlot) {
    setBooking(true);
    try {
      // Üye rezervasyonu - availability slot üzerinden
      await apiJson('/booking/pt/book-slot', {
        method: 'POST',
        body: JSON.stringify({ availabilityId: slot.id }),
      });
      setBooked(slot.id);
      setLegacySlots((prev) => prev.filter((s) => s.id !== slot.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rezervasyon talebi başarısız');
    } finally {
      setBooking(false);
    }
  }

  return (
    <div>
      <div className="week-nav">
        <button className="week-nav-btn" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}>← Önceki</button>
        <span className="week-nav-label">
          {weekOffset === 0 ? 'Bu Hafta' : weekOffset === 1 ? 'Gelecek Hafta' : `${weekOffset + 1}. Hafta`}
        </span>
        <button className="week-nav-btn" onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))} disabled={weekOffset >= 3}>Sonraki →</button>
      </div>
      <div className="date-tabs">
        {days.map(d => (
          <button key={d.value} className={`date-tab ${selectedDate === d.value ? 'active' : ''}`} onClick={() => { setSelectedDate(d.value); setBooked(null); }}>
            <span className="date-day">{d.dayName}</span>
            <span className="date-num">{d.label}</span>
          </button>
        ))}
      </div>
      {booked ? (
        <div className="event-joined-box"><span>✅</span><p>Rezervasyon talebiniz oluşturuldu!</p></div>
      ) : legacySlots.length === 0 ? (
        <p className="no-slots">Bu tarihte müsait saat yok</p>
      ) : (
        <div className="slots-grid">
          {legacySlots.map((s) => (
            <button
              key={s.id}
              className="slot-btn"
              onClick={() => void handleBookLegacy(s)}
              disabled={booking}
            >
              <span className="slot-time">
                {s.startTime} - {s.endTime}
              </span>
              <span className="slot-price">Rezerve Et</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type TrainerProfile = {
  id: string;
  userId: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  specializations: string[];
  certifications: string[];
  avgRating: string;
  totalSessions: number;
  offersSessionTypes: string[];
  club: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl: string | null;
    location: string | null;
  } | null;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    price: string;
    currency: string;
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
};

export function TrainerProfilePage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const load = useCallback(async () => {
    if (!trainerId) return;
    try {
      const data = await apiJson<TrainerProfile>(`/trainers/${encodeURIComponent(trainerId)}/profile`, { auth: false });
      setProfile(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [trainerId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="public-shell"><div className="profile-loading">Yükleniyor...</div></div>;
  if (!profile) return <div className="public-shell"><div className="profile-loading">Eğitmen bulunamadı</div></div>;

  return (
    <div className="public-shell">
      <nav className="public-nav">
        <Link to="/" className="public-nav-brand">
          <img src="/wellnesslogodaire.png?v=2" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png?v=2" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="profile-page">
        {/* Geri butonu */}
        <button
          type="button"
          className="trainer-back-btn"
          onClick={() => {
            // Eğer önceki sayfa varsa oraya, yoksa Tüm Eğitmenler'e
            if (window.history.length > 1) navigate(-1);
            else navigate('/all-trainers');
          }}
          aria-label="Geri"
        >
          ← Geri
        </button>

        {/* Hero */}
        <div className="trainer-hero">
          <div className="trainer-hero-photo">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt={profile.name} />
            ) : (
              <span className="trainer-hero-letter">{profile.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="trainer-hero-info">
            <h1>{profile.name}</h1>
            <div className="trainer-hero-stats">
              <span className="trainer-hero-rating">★ {Number(profile.avgRating).toFixed(1)}</span>
              <span className="trainer-hero-sessions">{profile.totalSessions} seans</span>
            </div>
            {profile.offersSessionTypes.length > 0 && (
              <div className="trainer-hero-types">
                {profile.offersSessionTypes.map((t) => (
                  <span key={t} className="profile-chip">
                    {t === 'personal_training' ? '🏋️ Personal Training' : '💆 Masaj'}
                  </span>
                ))}
              </div>
            )}
            {/* Kulüp linki - sadece PT eğitmenleri için */}
            {profile.club && profile.offersSessionTypes.includes('personal_training') && (
              <Link to={`/club/${profile.club.subdomain}`} className="trainer-club-link">
                {profile.club.logoUrl && <img src={profile.club.logoUrl} alt="" className="trainer-club-logo" />}
                <span>{profile.club.name}</span>
                {profile.club.location && <span className="trainer-club-loc">📍 {profile.club.location}</span>}
              </Link>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <section className="profile-section">
            <h2>📝 Hakkında</h2>
            <p>{profile.bio}</p>
          </section>
        )}

        {/* Uzmanlık */}
        {profile.specializations.length > 0 && (
          <section className="profile-section">
            <h2>🎯 Uzmanlık Alanları</h2>
            <div className="profile-chips">
              {profile.specializations.map((s, i) => <span key={i} className="profile-chip">{s}</span>)}
            </div>
          </section>
        )}

        {/* Sertifikalar */}
        {profile.certifications.length > 0 && (
          <section className="profile-section">
            <h2>📜 Sertifikalar</h2>
            <div className="profile-chips">
              {profile.certifications.map((c, i) => <span key={i} className="profile-chip cert-chip">{c}</span>)}
            </div>
          </section>
        )}

        {/* Paketler & Rezervasyon - PT eğitmenleri için */}
        {profile.offersSessionTypes.includes('personal_training') && (
        <section className="profile-section">
          <h2>💎 Eğitim Paketleri</h2>
          {profile.packages.filter(p => p.sessionType === 'personal_training').length > 0 ? (
            <div className="packages-grid">
              {profile.packages.filter(p => p.sessionType === 'personal_training').map(pkg => (
                <div key={pkg.id} className="pt-package-card">
                  <div className="pt-package-info">
                    <h3>{pkg.name}</h3>
                    <p>{pkg.sessionCount} seans · {pkg.validityDays} gün geçerli</p>
                  </div>
                  <div className="pt-package-price">
                    <strong>{pkg.price}₺</strong>
                    <span>{Math.round(parseFloat(pkg.price) / pkg.sessionCount)}₺/seans</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {requested ? (
            <div className="event-joined-box" style={{ marginTop: '1rem' }}>
              <span>✅</span>
              <p>Talebiniz kulübe iletildi!</p>
            </div>
          ) : token ? (
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.9rem' }}
              disabled={requesting}
              onClick={async () => {
                if (!profile) return;
                setRequesting(true);
                try {
                  await apiJson('/package-requests', {
                    method: 'POST',
                    body: JSON.stringify({
                      sessionType: 'personal_training',
                      message: `${profile.name} ile PT Eğitim paketi talebi (web)`,
                      preferredTrainerId: profile.id,
                    }),
                  });
                  setRequested(true);
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Talep gönderilemedi');
                } finally { setRequesting(false); }
              }}
            >
              {requesting ? 'Gönderiliyor...' : '📋 Paket Talep Et'}
            </button>
          ) : (
            <div className="login-required-box" style={{ marginTop: '1rem' }}>
              <p>Paket talep etmek için üye olmanız gerekiyor.</p>
              <div className="login-required-actions">
                <Link to="/register" className="btn-primary">Üye Ol</Link>
                <Link to="/login" className="btn-outline">Giriş Yap</Link>
              </div>
            </div>
          )}
          {/* PT Slot Takvimi */}
          {profile.club && (
            <>
              <h3 style={{ color: '#fff', marginTop: '2rem', marginBottom: '0.75rem' }}>📅 Müsait PT Saatleri</h3>
              {token ? (
                <ProviderSchedule subdomain={profile.club.subdomain} providerId={profile.id} trainerSlug={trainerId || profile.id} />
              ) : (
                <p className="no-slots">Müsait saatleri görmek için <Link to="/login">giriş yapın</Link></p>
              )}
            </>
          )}
        </section>
        )}

        {/* Masöz Ajanda - sadece masaj sunanlar için */}
        {profile.offersSessionTypes.includes('massage') && !profile.offersSessionTypes.includes('personal_training') && profile.club && (
        <section className="profile-section">
          <h2>📅 Müsait Masaj Saatleri</h2>
          {token ? (
            <ProviderSchedule subdomain={profile.club.subdomain} providerId={profile.id} trainerSlug={trainerId || profile.id} />
          ) : (
            <div className="login-required-box">
              <p>Müsait saatleri görmek ve rezervasyon yapmak için üye olmanız gerekiyor.</p>
              <div className="login-required-actions">
                <Link to="/register" className="btn-primary">Üye Ol</Link>
                <Link to="/login" className="btn-outline">Giriş Yap</Link>
              </div>
            </div>
          )}
        </section>
        )}

        {/* CTA - sadece PT eğitmenleri için kulüp linki */}
        {profile.offersSessionTypes.includes('personal_training') && (
          <section className="profile-section profile-cta">
            {profile.club ? (
              <Link to={`/club/${profile.club.subdomain}`} className="btn-outline" style={{ width: '100%', textAlign: 'center' }}>
                🏢 {profile.club.name} Sayfasını Görüntüle
              </Link>
            ) : (
              <a href="mailto:info@wellnessclub.com" className="btn-outline" style={{ width: '100%', textAlign: 'center' }}>
                💬 İletişime Geç
              </a>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
