import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PublicNav } from '../components/PublicNav';
import { trainerProfilePath } from '../lib/trainerUrl';

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
  clubSubdomain: string | null;
};

export function AllTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<Trainer[]>('/discovery/trainers?limit=100', { auth: false })
      .then(setTrainers)
      .catch(() => setTrainers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="vitrin-shell">
      <PublicNav active="discover" />
      <main className="vitrin-main" style={{ paddingTop: '2rem' }}>
        <section className="vitrin-section">
          <div className="vitrin-section-header">
            <div>
              <h2>💪 Tüm Eğitmenler</h2>
              <p>{trainers.length} eğitmen · sertifikalı ve kullanıcı puanlı</p>
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
          ) : trainers.length === 0 ? (
            <div className="vitrin-empty">
              <span className="vitrin-empty-icon">💪</span>
              <h3>Eğitmen bulunamadı</h3>
              <p>Yakında daha fazla eğitmen eklenecek.</p>
            </div>
          ) : (
            <div className="vitrin-trainers-grid">
              {trainers.map((tr) => (
                <Link
                  key={tr.id}
                  to={trainerProfilePath({
                    slug: tr.slug,
                    publicId: tr.publicId,
                    fallbackId: tr.userId,
                  })}
                  className="vitrin-trainer-card"
                >
                  <div className="vitrin-trainer-photo">
                    {tr.photoUrl ? (
                      <img src={tr.photoUrl} alt={tr.name} />
                    ) : (
                      <div className="vitrin-trainer-ph">{tr.name.slice(0, 2).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="vitrin-trainer-body">
                    <h3>{tr.name}</h3>
                    {tr.clubName && <p className="vitrin-trainer-club">{tr.clubName}</p>}
                    <div className="vitrin-trainer-stats">
                      {Number(tr.avgRating) > 0 && (
                        <span className="vitrin-card-rating">★ {Number(tr.avgRating).toFixed(1)}</span>
                      )}
                      <span className="vitrin-trainer-sessions">{tr.totalSessions} seans</span>
                    </div>
                    {tr.specialties.length > 0 && (
                      <p className="vitrin-trainer-specs">{tr.specialties.slice(0, 3).join(' · ')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
