import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type TrainerRow = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  bio: string | null;
  specializations: string[] | null;
  certifications: string[] | null;
  offersSessionTypes: string[];
  avgRating: string;
  totalSessions: number;
  createdAt: string;
};

export function TrainersManagementPage() {
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<TrainerRow[]>('/admin/trainers');
      setTrainers(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Eğitmenler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  function getSessionTypeLabel(type: string) {
    switch (type) {
      case 'personal_training':
        return 'PT';
      case 'massage':
        return 'Masaj';
      default:
        return type;
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Eğitmen Yönetimi</h1>
          <p className="dashboard-subtitle">Eğitmenleri görüntüle ve yönet</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : trainers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏋️</span>
          <p>Henüz eğitmen yok</p>
        </div>
      ) : (
        <div className="trainers-grid">
          {trainers.map((t) => (
            <div
              key={t.id}
              className={`trainer-card ${selectedTrainer?.id === t.id ? 'trainer-card-selected' : ''}`}
              onClick={() => setSelectedTrainer(selectedTrainer?.id === t.id ? null : t)}
            >
              <div className="trainer-card-header">
                <div className="trainer-avatar-lg">
                  {t.photoUrl ? (
                    <img src={t.photoUrl} alt={t.firstName} />
                  ) : (
                    <span>
                      {t.firstName[0]}
                      {t.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="trainer-card-info">
                  <h3>
                    {t.firstName} {t.lastName}
                  </h3>
                  <p className="trainer-email">{t.email}</p>
                  {t.phone && <p className="trainer-phone">📞 {t.phone}</p>}
                </div>
                <div className="trainer-rating">
                  <span className="rating-star">⭐</span>
                  <span>{Number(t.avgRating).toFixed(1)}</span>
                </div>
              </div>

              <div className="trainer-card-body">
                <div className="trainer-tags">
                  {t.offersSessionTypes?.map((st) => (
                    <span key={st} className="tag">
                      {getSessionTypeLabel(st)}
                    </span>
                  ))}
                </div>
                {t.specializations && t.specializations.length > 0 && (
                  <div className="trainer-specs">
                    {(t.specializations as string[]).map((s, i) => (
                      <span key={i} className="spec-tag">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="trainer-stats-row">
                  <span>📊 {t.totalSessions} seans</span>
                  <span>📅 {new Date(t.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {selectedTrainer?.id === t.id && (
                <div className="trainer-detail-panel">
                  <h4>Detaylar</h4>
                  {t.bio && <p className="trainer-bio">{t.bio}</p>}
                  {t.certifications && t.certifications.length > 0 && (
                    <div>
                      <strong>Sertifikalar:</strong>
                      <ul className="cert-list">
                        {(t.certifications as string[]).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
