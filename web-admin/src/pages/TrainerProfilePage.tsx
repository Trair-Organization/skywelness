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
  reviewCount?: number;
  offersSessionTypes: string[];
  verified: boolean;
  awayUntil: string | null;
  awayMessage: string | null;
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

type TrainerReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; photoUrl: string | null };
};

type ReviewListResponse = {
  reviews: TrainerReview[];
  total: number;
  avgRating: string;
  reviewCount: number;
};

type CanReviewResponse = {
  canReview: boolean;
  reason?: 'self' | 'already' | 'no_completed_lesson';
  myReview?: { id: string; rating: number; comment: string | null };
};

export function TrainerProfilePage() {
  const { trainerId } = useParams<{ trainerId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<TrainerReview[]>([]);
  const [reviewMeta, setReviewMeta] = useState<{ avgRating: string; reviewCount: number }>({
    avgRating: '0',
    reviewCount: 0,
  });
  const [canReview, setCanReview] = useState<CanReviewResponse | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!trainerId) return;
    try {
      const data = await apiJson<TrainerProfile>(`/trainers/${encodeURIComponent(trainerId)}/profile`, { auth: false });
      setProfile(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [trainerId]);

  const loadReviews = useCallback(async () => {
    if (!trainerId) return;
    try {
      const data = await apiJson<ReviewListResponse>(
        `/trainers/${encodeURIComponent(trainerId)}/reviews?limit=20`,
        { auth: false },
      );
      setReviews(data.reviews);
      setReviewMeta({ avgRating: data.avgRating, reviewCount: data.reviewCount });
    } catch { /* */ }
  }, [trainerId]);

  const loadCanReview = useCallback(async () => {
    if (!trainerId || !token) {
      setCanReview(null);
      return;
    }
    try {
      const data = await apiJson<CanReviewResponse>(
        `/trainers/${encodeURIComponent(trainerId)}/reviews/can-review`,
      );
      setCanReview(data);
    } catch {
      setCanReview(null);
    }
  }, [trainerId, token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadReviews(); }, [loadReviews]);
  useEffect(() => { void loadCanReview(); }, [loadCanReview]);

  async function handleSubmitReview() {
    if (!trainerId) return;
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Lütfen bir puan seçin');
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await apiJson(`/trainers/${encodeURIComponent(trainerId)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() || undefined }),
      });
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      await Promise.all([loadReviews(), loadCanReview(), load()]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Yorum gönderilemedi');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleDeleteMyReview() {
    if (!canReview?.myReview) return;
    if (!confirm('Yorumunuzu silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainers/reviews/${canReview.myReview.id}`, { method: 'DELETE' });
      await Promise.all([loadReviews(), loadCanReview(), load()]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Silinemedi');
    }
  }

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
            <h1>
              {profile.name}
              {profile.verified && (
                <span className="trainer-verified-badge" title="Sertifika doğrulandı">
                  ✓ Doğrulandı
                </span>
              )}
            </h1>
            <div className="trainer-hero-stats">
              <span className="trainer-hero-rating">
                ★ {Number(reviewMeta.avgRating || profile.avgRating).toFixed(1)}
                {reviewMeta.reviewCount > 0 && (
                  <span className="trainer-hero-rating-count"> ({reviewMeta.reviewCount})</span>
                )}
              </span>
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

        {/* Tatil banner */}
        {profile.awayUntil && new Date(profile.awayUntil) >= new Date(new Date().toISOString().slice(0, 10)) && (
          <div className="public-away-banner">
            🏖️ <strong>{profile.name}</strong> şu an müsait değil ({new Date(profile.awayUntil).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihine kadar).
            {profile.awayMessage && <p style={{ margin: '4px 0 0' }}>"{profile.awayMessage}"</p>}
          </div>
        )}

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

        {/* Yorumlar & Puanlar */}
        <section className="profile-section trainer-reviews-section">
          <div className="trainer-reviews-head">
            <h2>⭐ Yorumlar ve Puanlar</h2>
            {reviewMeta.reviewCount > 0 && (
              <div className="trainer-reviews-summary">
                <strong>{Number(reviewMeta.avgRating).toFixed(1)}</strong>
                <span className="muted">/ 5 · {reviewMeta.reviewCount} yorum</span>
              </div>
            )}
          </div>

          {/* Yorum bırakma kutusu */}
          {token && canReview && (
            <>
              {canReview.canReview && !showReviewForm && (
                <button
                  type="button"
                  className="btn-primary trainer-review-add-btn"
                  onClick={() => setShowReviewForm(true)}
                >
                  ✍️ Yorum Yaz
                </button>
              )}
              {canReview.canReview && showReviewForm && (
                <div className="trainer-review-form">
                  <div className="trainer-review-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        className={`trainer-review-star ${n <= reviewRating ? 'filled' : ''}`}
                        onClick={() => setReviewRating(n)}
                        aria-label={`${n} yıldız`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="muted">({reviewRating}/5)</span>
                  </div>
                  <textarea
                    className="trainer-review-input"
                    rows={3}
                    maxLength={500}
                    placeholder="Eğitmen hakkında deneyiminizi paylaşın (opsiyonel)..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />
                  {reviewError && <p className="trainer-review-error">{reviewError}</p>}
                  <div className="trainer-review-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewError(null);
                      }}
                      disabled={submittingReview}
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void handleSubmitReview()}
                      disabled={submittingReview}
                    >
                      {submittingReview ? 'Gönderiliyor...' : '✓ Yorumu Gönder'}
                    </button>
                  </div>
                </div>
              )}
              {!canReview.canReview && canReview.reason === 'no_completed_lesson' && (
                <p className="trainer-review-hint">
                  💡 Yorum bırakmak için bu eğitmenle en az bir tamamlanmış dersiniz olmalı.
                </p>
              )}
              {!canReview.canReview && canReview.reason === 'already' && canReview.myReview && (
                <div className="trainer-review-mine">
                  <div className="trainer-review-mine-head">
                    <span className="trainer-review-mine-stars">
                      {'★'.repeat(canReview.myReview.rating)}
                      <span className="trainer-review-mine-empty">
                        {'★'.repeat(5 - canReview.myReview.rating)}
                      </span>
                    </span>
                    <span className="muted">Sizin yorumunuz</span>
                    <button
                      type="button"
                      className="trainer-review-delete"
                      onClick={() => void handleDeleteMyReview()}
                      aria-label="Yorumumu sil"
                    >
                      Sil
                    </button>
                  </div>
                  {canReview.myReview.comment && <p>{canReview.myReview.comment}</p>}
                </div>
              )}
            </>
          )}
          {!token && (
            <p className="trainer-review-hint">
              💡 Yorum bırakmak için <Link to="/login">giriş yapın</Link>.
            </p>
          )}

          {/* Yorum listesi */}
          {reviews.length === 0 ? (
            <p className="trainer-reviews-empty">
              Henüz yorum yapılmamış. İlk yorumu siz yapın!
            </p>
          ) : (
            <div className="trainer-reviews-list">
              {reviews
                .filter((r) => !canReview?.myReview || r.id !== canReview.myReview.id)
                .map((r) => (
                  <div key={r.id} className="trainer-review-card">
                    <div className="trainer-review-card-head">
                      <div className="trainer-review-avatar">
                        {r.user.photoUrl ? (
                          <img src={r.user.photoUrl} alt="" />
                        ) : (
                          <span>{r.user.firstName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="trainer-review-user">
                        <strong>
                          {r.user.firstName} {r.user.lastName}
                        </strong>
                        <span className="trainer-review-stars-small">
                          {'★'.repeat(r.rating)}
                          <span className="trainer-review-mine-empty">
                            {'★'.repeat(5 - r.rating)}
                          </span>
                        </span>
                      </div>
                      <span className="muted trainer-review-date">
                        {new Date(r.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {r.comment && <p className="trainer-review-comment">{r.comment}</p>}
                  </div>
                ))}
            </div>
          )}
        </section>

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
