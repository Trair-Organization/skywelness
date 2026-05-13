import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  category?: string;
  requirements?: string | null;
  clubName: string | null;
  clubSubdomain: string | null;
};

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { token } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    try {
      // Discovery events endpoint'inden tüm etkinlikleri çekip ID ile filtrele
      const events = await apiJson<EventDetail[]>('/discovery/events?limit=50', { auth: false });
      const found = events.find((e) => e.id === eventId);
      setEvent(found || null);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  async function handleJoin() {
    if (!token || !event) return;
    setJoining(true);
    try {
      await apiJson(`/events/${event.id}/join`, { method: 'POST' });
      setJoined(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Katılım başarısız');
    } finally { setJoining(false); }
  }

  if (loading) return <div className="public-shell"><div className="profile-loading">Yükleniyor...</div></div>;
  if (!event) return <div className="public-shell"><div className="profile-loading">Etkinlik bulunamadı</div></div>;

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

      <div className="event-detail-page">
        {/* Hero Image */}
        {event.imageUrl && (
          <div className="event-detail-hero">
            <img src={event.imageUrl} alt={event.title} />
          </div>
        )}

        <div className="event-detail-content">
          {/* Header */}
          <div className="event-detail-header">
            <h1>{event.title}</h1>
            {event.category && <span className="event-category-badge">{event.category}</span>}
          </div>

          {/* Info Grid */}
          <div className="event-info-grid">
            <div className="event-info-item">
              <span className="event-info-icon">📅</span>
              <div>
                <strong>Tarih</strong>
                <p>{new Date(event.startsAt).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="event-info-item">
              <span className="event-info-icon">🕐</span>
              <div>
                <strong>Saat</strong>
                <p>
                  {new Date(event.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  {event.endsAt && ` — ${new Date(event.endsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            </div>
            {event.location && (
              <div className="event-info-item">
                <span className="event-info-icon">📍</span>
                <div>
                  <strong>Konum</strong>
                  <p>{event.location}</p>
                </div>
              </div>
            )}
            {event.coachName && (
              <div className="event-info-item">
                <span className="event-info-icon">🏋️</span>
                <div>
                  <strong>Eğitmen</strong>
                  <p>{event.coachName}</p>
                </div>
              </div>
            )}
            <div className="event-info-item">
              <span className="event-info-icon">👥</span>
              <div>
                <strong>Kapasite</strong>
                <p>{event.capacity} kişi</p>
              </div>
            </div>
            {event.clubName && (
              <div className="event-info-item">
                <span className="event-info-icon">🏢</span>
                <div>
                  <strong>Organizatör</strong>
                  <p>
                    {event.clubSubdomain ? (
                      <Link to={`/club/${event.clubSubdomain}`}>{event.clubName}</Link>
                    ) : event.clubName}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="event-detail-section">
              <h2>Etkinlik Hakkında</h2>
              <p>{event.description}</p>
            </div>
          )}

          {/* Requirements */}
          {event.requirements && (
            <div className="event-detail-section">
              <h2>Gereksinimler</h2>
              <p>{event.requirements}</p>
            </div>
          )}

          {/* CTA */}
          <div className="event-detail-cta">
            {joined ? (
              <div className="event-joined-box">
                <span>✅</span>
                <p>Etkinliğe katıldınız!</p>
              </div>
            ) : token ? (
              <button className="btn-primary event-join-btn" onClick={handleJoin} disabled={joining}>
                {joining ? 'Katılınıyor...' : '✓ Etkinliğe Katıl'}
              </button>
            ) : (
              <div className="login-required-box">
                <p>Etkinliğe katılmak için üye olmanız gerekiyor.</p>
                <div className="login-required-actions">
                  <Link to="/register" className="btn-primary">Üye Ol</Link>
                  <Link to="/login" className="btn-outline">Giriş Yap</Link>
                </div>
              </div>
            )}
          </div>

          <Link to="/discover" className="event-back-link">← Tüm Etkinlikler</Link>
        </div>
      </div>
    </div>
  );
}
