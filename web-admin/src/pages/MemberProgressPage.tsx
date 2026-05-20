import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  targetValue: string | null;
  targetUnit: string | null;
  startValue: string | null;
  currentValue: string | null;
  startDate: string;
  targetDate: string | null;
  completedAt: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progressPct: number | null;
  trainerName: string | null;
};

type Measurement = {
  id: string;
  measuredAt: string;
  weightKg: string | null;
  bodyFatPct: string | null;
  muscleMassKg: string | null;
  waistCm: string | null;
  hipCm: string | null;
  chestCm: string | null;
};

type Photo = {
  id: string;
  takenAt: string;
  photoUrl: string;
  tag: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  weight_loss: '⚖️ Kilo Verme',
  weight_gain: '📈 Kilo Alma',
  muscle_gain: '💪 Kas Kazanımı',
  fat_loss: '🔥 Yağ Yakma',
  strength: '🏋️ Kuvvet',
  endurance: '🏃 Dayanıklılık',
  flexibility: '🤸 Esneklik',
  rehab: '🩹 Rehabilitasyon',
  general: '🎯 Genel',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function MemberProgressPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiJson<Goal[]>('/me/progress/goals'),
      apiJson<Measurement[]>('/me/progress/measurements'),
      apiJson<Photo[]>('/me/progress/photos'),
    ])
      .then(([g, m, p]) => {
        if (!alive) return;
        setGoals(g);
        setMeasurements(m);
        setPhotos(p);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const latestMeasurement = measurements[0];

  if (loading) {
    return (
      <div className="member-progress-page">
        <p className="muted">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="member-progress-page">
      <div className="member-progress-header">
        <Link to="/dashboard" className="trainer-back-btn">
          ← Dashboard'a Dön
        </Link>
        <h1>📊 İlerleme Takibim</h1>
        <p className="muted">
          Eğitmeniniz tarafından kaydedilen hedef, ölçüm ve fotoğraflarınız.
        </p>
      </div>

      {error && <div className="profile-banner profile-banner-error">⚠️ {error}</div>}

      {/* Aktif Hedefler */}
      <section className="services-card">
        <h3 className="services-card-title">🚩 Aktif Hedeflerim</h3>
        {activeGoals.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Henüz aktif hedefin yok. Eğitmenin sana hedefler koyabilir.
          </p>
        ) : (
          <div className="goals-list">
            {activeGoals.map((g) => (
              <div key={g.id} className="goal-card goal-card-active">
                <div className="goal-card-header">
                  <div className="goal-card-title">
                    <strong>{g.title}</strong>
                    <span className="goal-card-category">
                      {CATEGORY_LABELS[g.category] ?? g.category}
                      {g.trainerName && ` · ${g.trainerName}`}
                    </span>
                  </div>
                </div>
                {g.description && <p className="goal-card-desc">{g.description}</p>}
                {g.targetValue && g.startValue && g.currentValue && (
                  <>
                    <div className="goal-progress-bar">
                      <div
                        className="goal-progress-fill"
                        style={{ width: `${g.progressPct ?? 0}%` }}
                      />
                    </div>
                    <div className="goal-progress-meta">
                      <span>
                        <strong>{g.currentValue}</strong> {g.targetUnit}
                        {' / '}
                        <span className="muted">
                          Hedef: {g.targetValue} {g.targetUnit}
                        </span>
                      </span>
                      <strong className="goal-progress-pct">
                        {g.progressPct !== null ? `%${g.progressPct.toFixed(0)}` : '—'}
                      </strong>
                    </div>
                  </>
                )}
                <div className="goal-card-meta">
                  <span>📅 {formatDate(g.startDate)}</span>
                  {g.targetDate && <span>🎯 {formatDate(g.targetDate)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Son Ölçümler */}
      {latestMeasurement && (
        <section className="services-card">
          <h3 className="services-card-title">📏 Son Ölçümlerim</h3>
          <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
            En son: {formatDate(latestMeasurement.measuredAt)}
          </p>
          <div className="member-measurement-grid">
            {latestMeasurement.weightKg && (
              <div className="member-measurement-item">
                <span>Kilo</span>
                <strong>{latestMeasurement.weightKg} kg</strong>
              </div>
            )}
            {latestMeasurement.bodyFatPct && (
              <div className="member-measurement-item">
                <span>Yağ Oranı</span>
                <strong>%{latestMeasurement.bodyFatPct}</strong>
              </div>
            )}
            {latestMeasurement.muscleMassKg && (
              <div className="member-measurement-item">
                <span>Kas Kütlesi</span>
                <strong>{latestMeasurement.muscleMassKg} kg</strong>
              </div>
            )}
            {latestMeasurement.waistCm && (
              <div className="member-measurement-item">
                <span>Bel</span>
                <strong>{latestMeasurement.waistCm} cm</strong>
              </div>
            )}
            {latestMeasurement.hipCm && (
              <div className="member-measurement-item">
                <span>Kalça</span>
                <strong>{latestMeasurement.hipCm} cm</strong>
              </div>
            )}
            {latestMeasurement.chestCm && (
              <div className="member-measurement-item">
                <span>Göğüs</span>
                <strong>{latestMeasurement.chestCm} cm</strong>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Fotoğraflar */}
      {photos.length > 0 && (
        <section className="services-card">
          <h3 className="services-card-title">📸 İlerleme Fotoğraflarım</h3>
          <div className="photos-grid">
            {photos.map((p) => (
              <div key={p.id} className="photo-card">
                <img src={p.photoUrl} alt={p.tag ?? formatDate(p.takenAt)} />
                <div className="photo-card-meta">
                  <strong>{formatDate(p.takenAt)}</strong>
                  {p.tag && <span className="photo-tag">{p.tag}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tamamlanan Hedefler */}
      {completedGoals.length > 0 && (
        <section className="services-card">
          <h3 className="services-card-title">🏆 Tamamlanan Hedeflerim</h3>
          <div className="goals-list">
            {completedGoals.map((g) => (
              <div key={g.id} className="goal-card goal-card-completed">
                <div className="goal-card-header">
                  <div className="goal-card-title">
                    <strong>✓ {g.title}</strong>
                    <span className="goal-card-category">
                      {CATEGORY_LABELS[g.category] ?? g.category}
                    </span>
                  </div>
                </div>
                {g.completedAt && (
                  <div className="goal-card-meta">
                    <span>🏆 {formatDate(g.completedAt)} tamamlandı</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {goals.length === 0 && !latestMeasurement && photos.length === 0 && (
        <div className="services-empty">
          <span className="services-empty-icon">📊</span>
          <p>Henüz takip verin yok.</p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Eğitmeniniz sizinle çalıştıkça hedefleriniz, ölçümleriniz ve ilerleme fotoğraflarınız
            burada görünecek.
          </p>
        </div>
      )}
    </div>
  );
}
