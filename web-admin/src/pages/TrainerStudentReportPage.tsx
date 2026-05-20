import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  upcomingLessons: number;
  remainingSessions: number;
  notes: Array<{ id: string; note: string; createdAt: string }>;
};

type Measurement = {
  id: string;
  measuredAt: string;
  weightKg: string | null;
  heightCm: string | null;
  bodyFatPct: string | null;
  muscleMassKg: string | null;
  waistCm: string | null;
  hipCm: string | null;
  chestCm: string | null;
  notes: string | null;
};

type Assessment = {
  id: string;
  assessedAt: string;
  type: string;
  data: Record<string, unknown>;
  notes: string | null;
};

type MemberPhoto = {
  id: string;
  takenAt: string;
  photoUrl: string;
  tag: string | null;
};

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
  status: string;
  progressPct: number | null;
};

type TrainerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string | null;
};

const FMS_TESTS = [
  { key: 'deepSquat', label: 'Deep Squat', bilateral: false },
  { key: 'hurdleStep', label: 'Hurdle Step', bilateral: true },
  { key: 'inlineLunge', label: 'Inline Lunge', bilateral: true },
  { key: 'shoulderMobility', label: 'Shoulder Mobility', bilateral: true },
  { key: 'aslr', label: 'Active Straight-Leg Raise', bilateral: true },
  { key: 'tspu', label: 'Trunk Stability Push-Up', bilateral: false },
  { key: 'rotaryStability', label: 'Rotary Stability', bilateral: true },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  weight_loss: 'Kilo Verme',
  weight_gain: 'Kilo Alma',
  muscle_gain: 'Kas Kazanımı',
  fat_loss: 'Yağ Yakma',
  strength: 'Kuvvet',
  endurance: 'Dayanıklılık',
  flexibility: 'Esneklik',
  rehab: 'Rehabilitasyon',
  general: 'Genel',
};

export function TrainerStudentReportPage() {
  const { userId } = useParams<{ userId: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [s, m, a, ph, gl, prof] = await Promise.all([
        apiJson<StudentDetail>(`/trainer-panel/students/${userId}`),
        apiJson<Measurement[]>(`/trainer-panel/students/${userId}/measurements`),
        apiJson<Assessment[]>(`/trainer-panel/students/${userId}/assessments`),
        apiJson<MemberPhoto[]>(`/trainer-panel/students/${userId}/photos`),
        apiJson<Goal[]>(`/trainer-panel/students/${userId}/goals`),
        apiJson<TrainerProfile>('/trainer-panel/profile'),
      ]);
      setStudent(s);
      setMeasurements(m);
      setAssessments(a);
      setPhotos(ph);
      setGoals(gl);
      setTrainer(prof);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="report-page">
        <p className="muted">Rapor hazırlanıyor...</p>
      </div>
    );
  }

  if (!student || error) {
    return (
      <div className="report-page">
        <p className="muted">{error ?? 'Öğrenci bulunamadı'}</p>
      </div>
    );
  }

  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime(),
  );
  const oldestMeasurement = sortedMeasurements[sortedMeasurements.length - 1];
  const latestMeasurement = sortedMeasurements[0];
  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  return (
    <div className="report-page">
      {/* Print controls (sadece ekranda görünür) */}
      <div className="report-controls no-print">
        <button onClick={() => window.history.back()} className="btn-outline">
          ← Geri
        </button>
        <button onClick={() => window.print()} className="btn-primary">
          🖨️ PDF / Yazdır
        </button>
      </div>

      <div className="report-document">
        {/* HEADER */}
        <header className="report-header">
          <div className="report-brand">
            <h1>WellnessClub</h1>
            <span>Wellness Marketplace</span>
          </div>
          <div className="report-meta">
            <span className="report-meta-label">Rapor Tarihi</span>
            <strong>{formatDate(new Date().toISOString())}</strong>
          </div>
        </header>

        {/* STUDENT CARD */}
        <section className="report-section report-student-card">
          <div className="report-student-photo">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} />
            ) : (
              <span>{student.firstName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="report-student-info">
            <h2>
              {student.firstName} {student.lastName}
            </h2>
            <p>
              📧 {student.email}
              {student.phone && <> · 📞 {student.phone}</>}
            </p>
            {trainer && (
              <p className="report-trainer-line">
                <strong>Eğitmen:</strong> {trainer.firstName} {trainer.lastName}
                {trainer.email && <> · {trainer.email}</>}
              </p>
            )}
          </div>
          <div className="report-student-stats">
            <div className="report-stat">
              <strong>{student.completedLessons}</strong>
              <span>Tamamlanan</span>
            </div>
            <div className="report-stat">
              <strong>{student.upcomingLessons}</strong>
              <span>Yaklaşan</span>
            </div>
            <div className="report-stat">
              <strong>{student.cancelledLessons}</strong>
              <span>İptal</span>
            </div>
          </div>
        </section>

        {/* GOALS */}
        {goals.length > 0 && (
          <section className="report-section">
            <h3 className="report-section-title">🚩 Hedefler</h3>
            {activeGoals.length > 0 && (
              <>
                <h4 className="report-subtitle">Aktif Hedefler</h4>
                <div className="report-goals">
                  {activeGoals.map((g) => (
                    <div key={g.id} className="report-goal-card">
                      <div className="report-goal-header">
                        <strong>{g.title}</strong>
                        <span className="report-tag">{CATEGORY_LABELS[g.category]}</span>
                      </div>
                      {g.description && <p>{g.description}</p>}
                      {g.startValue && g.targetValue && (
                        <div className="report-goal-progress">
                          <div className="report-progress-bar">
                            <div
                              className="report-progress-fill"
                              style={{ width: `${g.progressPct ?? 0}%` }}
                            />
                          </div>
                          <span>
                            <strong>{g.currentValue}</strong> {g.targetUnit} / hedef:{' '}
                            {g.targetValue} {g.targetUnit}
                            {g.progressPct !== null && ` (%${g.progressPct.toFixed(0)})`}
                          </span>
                        </div>
                      )}
                      <div className="report-goal-meta">
                        <span>Başlangıç: {formatDate(g.startDate)}</span>
                        {g.targetDate && <span>Hedef tarih: {formatDate(g.targetDate)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {completedGoals.length > 0 && (
              <>
                <h4 className="report-subtitle">🏆 Tamamlanan Hedefler</h4>
                <ul className="report-list">
                  {completedGoals.map((g) => (
                    <li key={g.id}>
                      <strong>{g.title}</strong>
                      {g.targetValue && (
                        <> — {g.targetValue} {g.targetUnit}</>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {/* MEASUREMENTS */}
        {measurements.length > 0 && (
          <section className="report-section">
            <h3 className="report-section-title">📏 Vücut Ölçümleri</h3>
            {oldestMeasurement && latestMeasurement && oldestMeasurement.id !== latestMeasurement.id && (
              <div className="report-summary">
                <h4 className="report-subtitle">Genel Karşılaştırma</h4>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Metrik</th>
                      <th>İlk ({formatDate(oldestMeasurement.measuredAt)})</th>
                      <th>Son ({formatDate(latestMeasurement.measuredAt)})</th>
                      <th>Fark</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ComparisonRow
                      label="Kilo (kg)"
                      first={oldestMeasurement.weightKg}
                      last={latestMeasurement.weightKg}
                      direction="lower"
                    />
                    <ComparisonRow
                      label="Yağ Oranı (%)"
                      first={oldestMeasurement.bodyFatPct}
                      last={latestMeasurement.bodyFatPct}
                      direction="lower"
                    />
                    <ComparisonRow
                      label="Kas Kütlesi (kg)"
                      first={oldestMeasurement.muscleMassKg}
                      last={latestMeasurement.muscleMassKg}
                      direction="higher"
                    />
                    <ComparisonRow
                      label="Bel Çevresi (cm)"
                      first={oldestMeasurement.waistCm}
                      last={latestMeasurement.waistCm}
                      direction="lower"
                    />
                    <ComparisonRow
                      label="Kalça Çevresi (cm)"
                      first={oldestMeasurement.hipCm}
                      last={latestMeasurement.hipCm}
                      direction="lower"
                    />
                  </tbody>
                </table>
              </div>
            )}

            <h4 className="report-subtitle">Ölçüm Geçmişi</h4>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Kilo</th>
                  <th>Yağ %</th>
                  <th>Kas</th>
                  <th>Bel</th>
                  <th>Kalça</th>
                  <th>Göğüs</th>
                </tr>
              </thead>
              <tbody>
                {sortedMeasurements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(m.measuredAt)}</td>
                    <td>{m.weightKg ?? '—'}</td>
                    <td>{m.bodyFatPct ?? '—'}</td>
                    <td>{m.muscleMassKg ?? '—'}</td>
                    <td>{m.waistCm ?? '—'}</td>
                    <td>{m.hipCm ?? '—'}</td>
                    <td>{m.chestCm ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ASSESSMENTS */}
        {assessments.length > 0 && (
          <section className="report-section">
            <h3 className="report-section-title">🎯 Değerlendirmeler</h3>
            {assessments.map((a) => (
              <AssessmentReport key={a.id} assessment={a} />
            ))}
          </section>
        )}

        {/* PHOTOS */}
        {photos.length > 0 && (
          <section className="report-section">
            <h3 className="report-section-title">📸 İlerleme Fotoğrafları</h3>
            <div className="report-photos">
              {photos.map((p) => (
                <div key={p.id} className="report-photo">
                  <img src={p.photoUrl} alt={p.tag ?? formatDate(p.takenAt)} />
                  <div className="report-photo-meta">
                    <strong>{formatDate(p.takenAt)}</strong>
                    {p.tag && <span>{p.tag}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NOTES */}
        {student.notes && student.notes.length > 0 && (
          <section className="report-section">
            <h3 className="report-section-title">📝 Eğitmen Notları</h3>
            <div className="report-notes">
              {student.notes.map((n) => (
                <div key={n.id} className="report-note">
                  <strong>{formatDate(n.createdAt)}</strong>
                  <p>{n.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER */}
        <footer className="report-footer">
          <p>
            Bu rapor <strong>WellnessClub</strong> platformu üzerinden oluşturulmuştur.
            <br />
            wellnessclub.tech · {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  first,
  last,
  direction,
}: {
  label: string;
  first: string | null;
  last: string | null;
  direction: 'lower' | 'higher';
}) {
  if (!first || !last) return null;
  const f = parseFloat(first);
  const l = parseFloat(last);
  const diff = l - f;
  const isImprovement = direction === 'lower' ? diff < 0 : diff > 0;
  return (
    <tr>
      <td>{label}</td>
      <td>{f.toFixed(1)}</td>
      <td>{l.toFixed(1)}</td>
      <td className={isImprovement ? 'report-positive' : 'report-negative'}>
        {diff >= 0 ? '+' : ''}
        {diff.toFixed(1)}
      </td>
    </tr>
  );
}

function AssessmentReport({ assessment: a }: { assessment: Assessment }) {
  const typeLabel =
    a.type === 'fms'
      ? 'FMS — Functional Movement Screen'
      : a.type === 'posture'
        ? 'Postür Analizi'
        : a.type === 'vo2_max'
          ? 'VO2 Max Testi'
          : a.type;

  if (a.type === 'fms') {
    let total = 0;
    for (const t of FMS_TESTS) {
      if (t.bilateral) {
        const l = a.data[`${t.key}Left`] as number | null;
        const r = a.data[`${t.key}Right`] as number | null;
        if (l != null && r != null) total += Math.min(l, r);
      } else {
        const v = a.data[t.key] as number | null;
        if (v != null) total += v;
      }
    }
    return (
      <div className="report-assessment-block">
        <div className="report-assessment-header">
          <strong>{typeLabel}</strong>
          <span>{formatDate(a.assessedAt)}</span>
          <span className="report-tag">Toplam: {total}/21</span>
        </div>
        <table className="report-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Sol</th>
              <th>Sağ</th>
              <th>Puan</th>
            </tr>
          </thead>
          <tbody>
            {FMS_TESTS.map((t) => {
              if (t.bilateral) {
                const l = a.data[`${t.key}Left`] as number | null;
                const r = a.data[`${t.key}Right`] as number | null;
                const score = l != null && r != null ? Math.min(l, r) : null;
                return (
                  <tr key={t.key}>
                    <td>{t.label}</td>
                    <td>{l ?? '—'}</td>
                    <td>{r ?? '—'}</td>
                    <td>
                      <strong>{score ?? '—'}</strong>
                    </td>
                  </tr>
                );
              }
              const v = a.data[t.key] as number | null;
              return (
                <tr key={t.key}>
                  <td>{t.label}</td>
                  <td colSpan={2}>—</td>
                  <td>
                    <strong>{v ?? '—'}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {a.notes && (
          <p className="report-assessment-note">
            <strong>Not:</strong> {a.notes}
          </p>
        )}
      </div>
    );
  }

  if (a.type === 'vo2_max') {
    const score = a.data.score as number | null;
    return (
      <div className="report-assessment-block">
        <div className="report-assessment-header">
          <strong>{typeLabel}</strong>
          <span>{formatDate(a.assessedAt)}</span>
          {score != null && <span className="report-tag">{score} ml/kg/dk</span>}
        </div>
        <ul className="report-data-list">
          {Object.entries(a.data).map(([k, v]) =>
            v != null ? (
              <li key={k}>
                <strong>{k}:</strong> {String(v)}
              </li>
            ) : null,
          )}
        </ul>
        {a.notes && (
          <p className="report-assessment-note">
            <strong>Not:</strong> {a.notes}
          </p>
        )}
      </div>
    );
  }

  if (a.type === 'posture') {
    const front = (a.data.front ?? {}) as Record<string, string>;
    const side = (a.data.side ?? {}) as Record<string, string>;
    const back = (a.data.back ?? {}) as Record<string, string>;
    return (
      <div className="report-assessment-block">
        <div className="report-assessment-header">
          <strong>{typeLabel}</strong>
          <span>{formatDate(a.assessedAt)}</span>
        </div>
        <div className="report-posture-grid">
          <div>
            <h5>Önden</h5>
            <ul>
              {Object.entries(front).map(([k, v]) =>
                v ? (
                  <li key={k}>
                    {k}: <strong>{v}</strong>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
          <div>
            <h5>Yandan</h5>
            <ul>
              {Object.entries(side).map(([k, v]) =>
                v ? (
                  <li key={k}>
                    {k}: <strong>{v}</strong>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
          <div>
            <h5>Arkadan</h5>
            <ul>
              {Object.entries(back).map(([k, v]) =>
                v ? (
                  <li key={k}>
                    {k}: <strong>{v}</strong>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </div>
        {a.notes && (
          <p className="report-assessment-note">
            <strong>Not:</strong> {a.notes}
          </p>
        )}
      </div>
    );
  }

  return null;
}
