import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PublicNav } from '../components/PublicNav';

type Event = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  imageUrl: string | null;
  category: string | null;
  price: string;
  capacity: number;
  participantCount: number;
  coachName: string | null;
  location: string | null;
  clubName: string | null;
  clubSubdomain: string | null;
};

export function AllEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<Event[]>('/discovery/events?limit=100', { auth: false })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="vitrin-shell">
      <PublicNav active="discover" />
      <main className="vitrin-main" style={{ paddingTop: '2rem' }}>
        <section className="vitrin-section">
          <div className="vitrin-section-header">
            <div>
              <h2>📅 Tüm Yaklaşan Etkinlikler</h2>
              <p>{events.length} etkinlik · tüm kulüplerden açık etkinlikler ve dersler</p>
            </div>
            <Link to="/discover" className="vitrin-see-all">
              ← Ana sayfaya dön
            </Link>
          </div>

          {loading ? (
            <div className="vitrin-loading">
              <div className="vitrin-spinner" />
              <p>Yükleniyor...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="vitrin-empty">
              <span className="vitrin-empty-icon">📅</span>
              <h3>Yaklaşan etkinlik yok</h3>
              <p>Yakında yeni etkinlikler eklenecek.</p>
            </div>
          ) : (
            <div className="vitrin-events-grid">
              {events.map((ev) => {
                const date = new Date(ev.startsAt);
                const dateStr = date.toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                });
                const timeStr = date.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <Link key={ev.id} to={`/event/${ev.id}`} className="vitrin-event-card">
                    <div className="vitrin-event-img">
                      {ev.imageUrl ? (
                        <img src={ev.imageUrl} alt={ev.title} />
                      ) : (
                        <div className="vitrin-club-ph">📅</div>
                      )}
                      <span className="vitrin-event-date-badge">
                        {dateStr} · {timeStr}
                      </span>
                    </div>
                    <div className="vitrin-event-body">
                      {ev.category && (
                        <span className="vitrin-event-category">{ev.category}</span>
                      )}
                      <h3>{ev.title}</h3>
                      {ev.clubName && <p className="vitrin-event-club">📍 {ev.clubName}</p>}
                      <div className="vitrin-event-footer">
                        <span className="vitrin-event-price">
                          {parseFloat(ev.price) > 0 ? `${ev.price}₺` : 'Ücretsiz'}
                        </span>
                        {ev.coachName && (
                          <span className="vitrin-event-coach">👤 {ev.coachName}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
