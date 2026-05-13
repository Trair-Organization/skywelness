import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

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
          <img src="/wellnesslogodaire.png" alt="Wellness Club" className="nav-logo" />
          <img src="/wellnesslogoyazi.png" alt="Wellness Club" className="nav-logo-text" />
        </Link>
        <div className="public-nav-links">
          <Link to="/discover">Keşfet</Link>
          <Link to="/login" className="public-nav-login">Giriş Yap</Link>
        </div>
      </nav>

      <div className="profile-page">
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
            {profile.club && (
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

        {/* Hizmetler */}
        {profile.services.length > 0 && (
          <section className="profile-section">
            <h2>🛍️ Hizmetler</h2>
            <div className="services-list">
              {profile.services.map((s) => (
                <div key={s.id} className="service-item">
                  <div>
                    <h3>{s.name}</h3>
                    {s.description && <p>{s.description}</p>}
                    <span className="service-duration">⏱ {s.durationMinutes} dk</span>
                  </div>
                  <span className="service-price">{s.price}₺</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PT Paket */}
        <section className="profile-section">
          <h2>💎 Eğitim Paketi</h2>
          <div className="pt-package-card">
            <div className="pt-package-info">
              <h3>10 PT Eğitim</h3>
              <p>Kişisel antrenman programı · Birebir eğitim</p>
            </div>
            <div className="pt-package-price">
              <strong>15.000₺</strong>
              <span>1.500₺/seans</span>
            </div>
          </div>
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
                      message: `${profile.name} ile 10 PT Eğitim paketi talebi (web)`,
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
        </section>

        {/* CTA */}
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
      </div>
    </div>
  );
}
