import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

type StudentDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  source: string;
  connectedAt: string;
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
  bicepsLeftCm: string | null;
  bicepsRightCm: string | null;
  thighLeftCm: string | null;
  thighRightCm: string | null;
  calfLeftCm: string | null;
  calfRightCm: string | null;
  notes: string | null;
};

type Assessment = {
  id: string;
  assessedAt: string;
  type: 'fms' | 'posture' | 'vo2_max' | 'flexibility' | 'strength' | 'custom';
  data: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
};

type MemberPhoto = {
  id: string;
  takenAt: string;
  photoUrl: string;
  tag: string | null;
  notes: string | null;
};

type Tab = 'overview' | 'photos' | 'measurements' | 'assessments' | 'history' | 'notes';

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
    month: 'short',
    year: 'numeric',
  });
}

export function TrainerStudentDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');

  // Note form
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoTag, setPhotoTag] = useState('');
  const [photoTakenAt, setPhotoTakenAt] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  // Measurement form
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [measurementForm, setMeasurementForm] = useState<Record<string, string>>({
    measuredAt: new Date().toISOString().slice(0, 10),
  });
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  // Assessment form
  const [showAssessmentForm, setShowAssessmentForm] = useState<
    | null
    | 'fms'
    | 'posture'
    | 'vo2_max'
  >(null);
  const [assessmentDate, setAssessmentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [assessmentData, setAssessmentData] = useState<Record<string, unknown>>({});
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [savingAssessment, setSavingAssessment] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, m, a, ph] = await Promise.all([
        apiJson<StudentDetail>(`/trainer-panel/students/${userId}`),
        apiJson<Measurement[]>(`/trainer-panel/students/${userId}/measurements`),
        apiJson<Assessment[]>(`/trainer-panel/students/${userId}/assessments`),
        apiJson<MemberPhoto[]>(`/trainer-panel/students/${userId}/photos`),
      ]);
      setStudent(s);
      setMeasurements(m);
      setAssessments(a);
      setPhotos(ph);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  function flash(msg: string) {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 2500);
  }

  function flashErr(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  }

  // ─── Notes ─────────────────────────
  async function handleAddNote() {
    if (!newNote.trim() || !userId) return;
    setSavingNote(true);
    try {
      await apiJson(`/trainer-panel/students/${userId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote.trim() }),
      });
      setNewNote('');
      await load();
      flash('✅ Not eklendi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Eklenemedi');
    } finally {
      setSavingNote(false);
    }
  }

  // ─── Photos ────────────────────────
  async function handleUploadPhoto(file: File) {
    if (!userId) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const upload = await apiJson<{ url: string }>('/auth/upload-avatar', {
        method: 'POST',
        body: fd,
        headers: undefined,
      });
      const fullUrl = upload.url.startsWith('http')
        ? upload.url
        : `https://www.wellnessclub.tech${upload.url}`;
      await apiJson(`/trainer-panel/students/${userId}/photos`, {
        method: 'POST',
        body: JSON.stringify({
          takenAt: photoTakenAt,
          photoUrl: fullUrl,
          tag: photoTag.trim() || undefined,
        }),
      });
      setPhotoTag('');
      await load();
      flash('✅ Fotoğraf eklendi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Yükleme başarısız');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeletePhoto(id: string) {
    if (!confirm('Fotoğrafı silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/photos/${id}`, { method: 'DELETE' });
      await load();
      flash('✅ Fotoğraf silindi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Silinemedi');
    }
  }

  // ─── Measurements ───────────────────
  async function handleSaveMeasurement() {
    if (!userId) return;
    setSavingMeasurement(true);
    try {
      const payload: Record<string, unknown> = { measuredAt: measurementForm.measuredAt };
      const fields = [
        'weightKg',
        'heightCm',
        'bodyFatPct',
        'muscleMassKg',
        'waistCm',
        'hipCm',
        'chestCm',
        'bicepsLeftCm',
        'bicepsRightCm',
        'thighLeftCm',
        'thighRightCm',
        'calfLeftCm',
        'calfRightCm',
      ];
      for (const f of fields) {
        if (measurementForm[f]) payload[f] = parseFloat(measurementForm[f]);
      }
      if (measurementForm.notes) payload.notes = measurementForm.notes;
      await apiJson(`/trainer-panel/students/${userId}/measurements`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowMeasurementForm(false);
      setMeasurementForm({ measuredAt: new Date().toISOString().slice(0, 10) });
      await load();
      flash('✅ Ölçüm kaydedildi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    } finally {
      setSavingMeasurement(false);
    }
  }

  async function handleDeleteMeasurement(id: string) {
    if (!confirm('Ölçümü silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/measurements/${id}`, { method: 'DELETE' });
      await load();
      flash('✅ Ölçüm silindi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Silinemedi');
    }
  }

  // ─── Assessments ───────────────────
  function startFmsForm() {
    setShowAssessmentForm('fms');
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    const init: Record<string, unknown> = {};
    for (const t of FMS_TESTS) {
      if (t.bilateral) {
        init[`${t.key}Left`] = '';
        init[`${t.key}Right`] = '';
      } else {
        init[t.key] = '';
      }
    }
    setAssessmentData(init);
    setAssessmentNotes('');
  }

  function startVo2Form() {
    setShowAssessmentForm('vo2_max');
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    setAssessmentData({
      protocol: 'cooper',
      restingHr: '',
      maxHr: '',
      score: '',
      distanceM: '',
    });
    setAssessmentNotes('');
  }

  function startPostureForm() {
    setShowAssessmentForm('posture');
    setAssessmentDate(new Date().toISOString().slice(0, 10));
    setAssessmentData({
      front: { headTilt: '', shoulderHigh: '', pelvicTilt: '' },
      side: { headForward: '', kyphosis: '', lordosis: '' },
      back: { scapulaWinging: '', scoliosis: '' },
    });
    setAssessmentNotes('');
  }

  async function handleSaveAssessment() {
    if (!userId || !showAssessmentForm) return;
    setSavingAssessment(true);
    try {
      // FMS: empty stringleri null'a çevir, sayıya parse et
      let cleanedData = assessmentData;
      if (showAssessmentForm === 'fms') {
        cleanedData = Object.fromEntries(
          Object.entries(assessmentData).map(([k, v]) => [
            k,
            v === '' || v == null ? null : parseInt(String(v)),
          ]),
        );
      }
      await apiJson(`/trainer-panel/students/${userId}/assessments`, {
        method: 'POST',
        body: JSON.stringify({
          type: showAssessmentForm,
          assessedAt: assessmentDate,
          data: cleanedData,
          notes: assessmentNotes.trim() || undefined,
        }),
      });
      setShowAssessmentForm(null);
      setAssessmentData({});
      setAssessmentNotes('');
      await load();
      flash('✅ Değerlendirme kaydedildi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    } finally {
      setSavingAssessment(false);
    }
  }

  async function handleDeleteAssessment(id: string) {
    if (!confirm('Değerlendirmeyi silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/assessments/${id}`, { method: 'DELETE' });
      await load();
      flash('✅ Silindi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Silinemedi');
    }
  }

  // ─── Calculations ───────────────────
  const latestMeasurement = measurements[0];
  const oldestMeasurement = measurements[measurements.length - 1];
  const weightChange = useMemo(() => {
    if (!latestMeasurement?.weightKg || !oldestMeasurement?.weightKg) return null;
    if (latestMeasurement.id === oldestMeasurement.id) return null;
    return parseFloat(latestMeasurement.weightKg) - parseFloat(oldestMeasurement.weightKg);
  }, [latestMeasurement, oldestMeasurement]);

  if (loading) {
    return (
      <div className="trainer-student-detail">
        <p className="muted">Yükleniyor...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="trainer-student-detail">
        <div className="profile-banner profile-banner-error">
          ⚠️ Öğrenci bulunamadı
        </div>
        <Link to="/trainer/students" className="btn-outline" style={{ marginTop: '1rem' }}>
          ← Öğrencilere Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="trainer-student-detail">
      {/* Header */}
      <div className="student-detail-header">
        <button
          className="trainer-back-btn"
          onClick={() => navigate('/trainer/students')}
          style={{ marginBottom: '0.75rem' }}
        >
          ← Öğrencilere Dön
        </button>
        <div className="student-detail-hero">
          <div className="student-detail-photo">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={`${student.firstName} ${student.lastName}`} />
            ) : (
              <span>{student.firstName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="student-detail-info">
            <h1>
              {student.firstName} {student.lastName}
            </h1>
            <p className="muted">
              {student.email} {student.phone && ` · ${student.phone}`}
            </p>
            <div className="student-detail-stats">
              <span className="student-stat-pill">
                ✅ {student.completedLessons} tamamlandı
              </span>
              <span className="student-stat-pill">📅 {student.upcomingLessons} bekliyor</span>
              <span className="student-stat-pill">❌ {student.cancelledLessons} iptal</span>
              {student.remainingSessions > 0 && (
                <span className="student-stat-pill student-stat-package">
                  📦 {student.remainingSessions} seans paket
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="profile-banner profile-banner-error">⚠️ {error}</div>}
      {success && <div className="profile-banner profile-banner-success">{success}</div>}

      {/* Tabs */}
      <div className="services-tabs">
        <button
          className={`services-tab ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          📊 Genel
        </button>
        <button
          className={`services-tab ${tab === 'photos' ? 'active' : ''}`}
          onClick={() => setTab('photos')}
        >
          📸 Fotoğraflar
          {photos.length > 0 && <span className="services-tab-count">{photos.length}</span>}
        </button>
        <button
          className={`services-tab ${tab === 'measurements' ? 'active' : ''}`}
          onClick={() => setTab('measurements')}
        >
          📏 Ölçümler
          {measurements.length > 0 && (
            <span className="services-tab-count">{measurements.length}</span>
          )}
        </button>
        <button
          className={`services-tab ${tab === 'assessments' ? 'active' : ''}`}
          onClick={() => setTab('assessments')}
        >
          🎯 Değerlendirmeler
          {assessments.length > 0 && (
            <span className="services-tab-count">{assessments.length}</span>
          )}
        </button>
        <button
          className={`services-tab ${tab === 'notes' ? 'active' : ''}`}
          onClick={() => setTab('notes')}
        >
          📝 Notlar
          {student.notes.length > 0 && (
            <span className="services-tab-count">{student.notes.length}</span>
          )}
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="services-grid-cards" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <section className="services-card">
            <h3 className="services-card-title">📈 Hızlı Özet</h3>
            <div className="quick-summary">
              {latestMeasurement?.weightKg && (
                <div className="quick-summary-row">
                  <span>Son kilo</span>
                  <strong>
                    {parseFloat(latestMeasurement.weightKg).toFixed(1)} kg
                    {weightChange !== null && weightChange !== 0 && (
                      <span
                        className={
                          weightChange < 0 ? 'student-trend-down' : 'student-trend-up'
                        }
                        style={{ marginLeft: 6, fontSize: '0.78rem' }}
                      >
                        {weightChange < 0 ? '▼' : '▲'} {Math.abs(weightChange).toFixed(1)} kg
                      </span>
                    )}
                  </strong>
                </div>
              )}
              {latestMeasurement?.bodyFatPct && (
                <div className="quick-summary-row">
                  <span>Yağ oranı</span>
                  <strong>%{latestMeasurement.bodyFatPct}</strong>
                </div>
              )}
              {latestMeasurement?.muscleMassKg && (
                <div className="quick-summary-row">
                  <span>Kas kütlesi</span>
                  <strong>{latestMeasurement.muscleMassKg} kg</strong>
                </div>
              )}
              {!latestMeasurement && (
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  Henüz ölçüm yok.{' '}
                  <button
                    className="btn-link"
                    onClick={() => setTab('measurements')}
                    style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)', padding: 0 }}
                  >
                    Ölçüm ekle
                  </button>
                </p>
              )}
            </div>
          </section>

          <section className="services-card">
            <h3 className="services-card-title">🎯 Son Değerlendirmeler</h3>
            {assessments.length === 0 ? (
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Henüz değerlendirme yok.{' '}
                <button
                  className="btn-link"
                  onClick={() => setTab('assessments')}
                  style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)', padding: 0 }}
                >
                  FMS Testi yap
                </button>
              </p>
            ) : (
              <div className="quick-summary">
                {assessments.slice(0, 3).map((a) => (
                  <div key={a.id} className="quick-summary-row">
                    <span>
                      {a.type === 'fms'
                        ? 'FMS Testi'
                        : a.type === 'posture'
                          ? 'Postür'
                          : a.type === 'vo2_max'
                            ? 'VO2 Max'
                            : a.type}
                    </span>
                    <strong>{formatDate(a.assessedAt)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* PHOTOS TAB */}
      {tab === 'photos' && (
        <div>
          <section className="services-card services-form-card">
            <h3 className="services-form-title">📸 Yeni Fotoğraf Ekle</h3>
            <div className="services-grid-2">
              <label className="profile-field">
                <span>Çekim Tarihi</span>
                <input
                  type="date"
                  className="profile-input"
                  value={photoTakenAt}
                  onChange={(e) => setPhotoTakenAt(e.target.value)}
                />
              </label>
              <label className="profile-field">
                <span>Etiket (opsiyonel)</span>
                <input
                  type="text"
                  className="profile-input"
                  value={photoTag}
                  onChange={(e) => setPhotoTag(e.target.value)}
                  placeholder="Örn: Başlangıç, 1. Ay, 3. Ay"
                />
              </label>
            </div>
            <label className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              {uploadingPhoto ? '⏳ Yükleniyor...' : '📤 Fotoğraf Yükle'}
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={uploadingPhoto}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleUploadPhoto(f);
                }}
              />
            </label>
            <small className="profile-hint">
              Otomatik kare kırpılır (800x800). Karşılaştırma için "Başlangıç" etiketini kullanın.
            </small>
          </section>

          {photos.length === 0 ? (
            <div className="services-empty">
              <span className="services-empty-icon">📸</span>
              <p>Henüz fotoğraf yok.</p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Öğrencinin başlangıç fotoğrafını yükleyin, ileride karşılaştırmak için saklayın.
              </p>
            </div>
          ) : (
            <div className="photos-grid">
              {photos.map((p) => (
                <div key={p.id} className="photo-card">
                  <img src={p.photoUrl} alt={p.tag ?? formatDate(p.takenAt)} />
                  <div className="photo-card-meta">
                    <strong>{formatDate(p.takenAt)}</strong>
                    {p.tag && <span className="photo-tag">{p.tag}</span>}
                  </div>
                  <button
                    className="photo-delete-btn"
                    onClick={() => void handleDeletePhoto(p.id)}
                    aria-label="Sil"
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MEASUREMENTS TAB */}
      {tab === 'measurements' && (
        <div>
          <div className="services-tab-header">
            <h2 className="services-card-title" style={{ margin: 0 }}>
              📏 Vücut Ölçümleri
            </h2>
            <button
              className="btn-primary"
              onClick={() => {
                setMeasurementForm({ measuredAt: new Date().toISOString().slice(0, 10) });
                setShowMeasurementForm(true);
              }}
            >
              + Yeni Ölçüm
            </button>
          </div>

          {showMeasurementForm && (
            <section className="services-card services-form-card">
              <h3 className="services-form-title">➕ Yeni Ölçüm</h3>
              <label className="profile-field">
                <span>Ölçüm Tarihi *</span>
                <input
                  type="date"
                  className="profile-input"
                  value={measurementForm.measuredAt ?? ''}
                  onChange={(e) =>
                    setMeasurementForm({ ...measurementForm, measuredAt: e.target.value })
                  }
                />
              </label>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginTop: 8 }}>
                Genel
              </h4>
              <div className="services-grid-2">
                <label className="profile-field">
                  <span>Kilo (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.weightKg ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, weightKg: e.target.value })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Boy (cm)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.heightCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, heightCm: e.target.value })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Yağ Oranı (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.bodyFatPct ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, bodyFatPct: e.target.value })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Kas Kütlesi (kg)</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.muscleMassKg ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, muscleMassKg: e.target.value })
                    }
                  />
                </label>
              </div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginTop: 8 }}>
                Çevre Ölçüleri (cm)
              </h4>
              <div className="services-grid-3">
                <label className="profile-field">
                  <span>Bel</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.waistCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, waistCm: e.target.value })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Kalça</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.hipCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, hipCm: e.target.value })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Göğüs</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.chestCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({ ...measurementForm, chestCm: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="services-grid-2">
                <label className="profile-field">
                  <span>Sol Pazu</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.bicepsLeftCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        bicepsLeftCm: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Sağ Pazu</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.bicepsRightCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        bicepsRightCm: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Sol Uyluk</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.thighLeftCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        thighLeftCm: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Sağ Uyluk</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.thighRightCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        thighRightCm: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Sol Baldır</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.calfLeftCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        calfLeftCm: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="profile-field">
                  <span>Sağ Baldır</span>
                  <input
                    type="number"
                    step="0.1"
                    className="profile-input"
                    value={measurementForm.calfRightCm ?? ''}
                    onChange={(e) =>
                      setMeasurementForm({
                        ...measurementForm,
                        calfRightCm: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className="profile-field">
                <span>Notlar</span>
                <textarea
                  className="profile-input profile-textarea"
                  rows={2}
                  value={measurementForm.notes ?? ''}
                  onChange={(e) =>
                    setMeasurementForm({ ...measurementForm, notes: e.target.value })
                  }
                />
              </label>
              <div className="services-form-actions">
                <button
                  className="btn-primary"
                  onClick={() => void handleSaveMeasurement()}
                  disabled={savingMeasurement}
                >
                  {savingMeasurement ? '⏳' : '💾 Kaydet'}
                </button>
                <button
                  className="btn-outline"
                  onClick={() => setShowMeasurementForm(false)}
                >
                  İptal
                </button>
              </div>
            </section>
          )}

          {measurements.length === 0 ? (
            <div className="services-empty">
              <span className="services-empty-icon">📏</span>
              <p>Henüz ölçüm yok.</p>
            </div>
          ) : (
            <div className="measurements-table-wrap">
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Kilo</th>
                    <th>Yağ %</th>
                    <th>Kas</th>
                    <th>Bel</th>
                    <th>Kalça</th>
                    <th>Göğüs</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m) => (
                    <tr key={m.id}>
                      <td>{formatDate(m.measuredAt)}</td>
                      <td>{m.weightKg ?? '—'}</td>
                      <td>{m.bodyFatPct ?? '—'}</td>
                      <td>{m.muscleMassKg ?? '—'}</td>
                      <td>{m.waistCm ?? '—'}</td>
                      <td>{m.hipCm ?? '—'}</td>
                      <td>{m.chestCm ?? '—'}</td>
                      <td>
                        <button
                          className="btn-outline btn-sm services-btn-danger"
                          onClick={() => void handleDeleteMeasurement(m.id)}
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ASSESSMENTS TAB */}
      {tab === 'assessments' && (
        <div>
          <div className="services-tab-header">
            <h2 className="services-card-title" style={{ margin: 0 }}>
              🎯 Değerlendirmeler
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn-outline btn-sm" onClick={startFmsForm}>
                🏃 FMS Testi
              </button>
              <button className="btn-outline btn-sm" onClick={startVo2Form}>
                💓 VO2 Max
              </button>
              <button className="btn-outline btn-sm" onClick={startPostureForm}>
                🧍 Postür Analizi
              </button>
            </div>
          </div>

          {showAssessmentForm === 'fms' && (
            <FmsForm
              date={assessmentDate}
              setDate={setAssessmentDate}
              data={assessmentData}
              setData={setAssessmentData}
              notes={assessmentNotes}
              setNotes={setAssessmentNotes}
              onSave={handleSaveAssessment}
              onCancel={() => setShowAssessmentForm(null)}
              saving={savingAssessment}
            />
          )}

          {showAssessmentForm === 'vo2_max' && (
            <Vo2Form
              date={assessmentDate}
              setDate={setAssessmentDate}
              data={assessmentData}
              setData={setAssessmentData}
              notes={assessmentNotes}
              setNotes={setAssessmentNotes}
              onSave={handleSaveAssessment}
              onCancel={() => setShowAssessmentForm(null)}
              saving={savingAssessment}
            />
          )}

          {showAssessmentForm === 'posture' && (
            <PostureForm
              date={assessmentDate}
              setDate={setAssessmentDate}
              data={assessmentData}
              setData={setAssessmentData}
              notes={assessmentNotes}
              setNotes={setAssessmentNotes}
              onSave={handleSaveAssessment}
              onCancel={() => setShowAssessmentForm(null)}
              saving={savingAssessment}
            />
          )}

          {assessments.length === 0 ? (
            <div className="services-empty">
              <span className="services-empty-icon">🎯</span>
              <p>Henüz değerlendirme yok.</p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                FMS, VO2 Max veya postür analizi yaparak öğrencinin başlangıç durumunu kayıt
                altına alın.
              </p>
            </div>
          ) : (
            <div className="services-grid-cards">
              {assessments.map((a) => (
                <AssessmentCard
                  key={a.id}
                  assessment={a}
                  onDelete={() => void handleDeleteAssessment(a.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* NOTES TAB */}
      {tab === 'notes' && (
        <div>
          <section className="services-card">
            <h3 className="services-card-title">📝 Not Ekle</h3>
            <textarea
              className="profile-input profile-textarea"
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Ders notu, hedef, gözlem..."
            />
            <div style={{ marginTop: 8 }}>
              <button
                className="btn-primary"
                onClick={() => void handleAddNote()}
                disabled={savingNote || !newNote.trim()}
              >
                {savingNote ? '⏳' : '+ Not Ekle'}
              </button>
            </div>
          </section>

          {student.notes.length === 0 ? (
            <div className="services-empty">
              <span className="services-empty-icon">📝</span>
              <p>Henüz not yok.</p>
            </div>
          ) : (
            <div className="notes-list">
              {student.notes.map((n) => (
                <div key={n.id} className="note-card">
                  <div className="note-card-meta">
                    <strong>{formatDate(n.createdAt)}</strong>
                  </div>
                  <p>{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FMS Form ─────────────────────────
function FmsForm({
  date,
  setDate,
  data,
  setData,
  notes,
  setNotes,
  onSave,
  onCancel,
  saving,
}: {
  date: string;
  setDate: (v: string) => void;
  data: Record<string, unknown>;
  setData: (d: Record<string, unknown>) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  // Toplam puan hesaplama (FMS standart: bilateral testte düşük olan alınır)
  const total = useMemo(() => {
    let sum = 0;
    for (const t of FMS_TESTS) {
      if (t.bilateral) {
        const left = data[`${t.key}Left`];
        const right = data[`${t.key}Right`];
        const l = typeof left === 'number' ? left : parseInt(String(left ?? '')) || null;
        const r = typeof right === 'number' ? right : parseInt(String(right ?? '')) || null;
        if (l !== null && r !== null) sum += Math.min(l, r);
      } else {
        const v = data[t.key];
        const n = typeof v === 'number' ? v : parseInt(String(v ?? '')) || null;
        if (n !== null) sum += n;
      }
    }
    return sum;
  }, [data]);

  return (
    <section className="services-card services-form-card">
      <h3 className="services-form-title">🏃 FMS — Functional Movement Screen</h3>
      <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
        Her test 0-3 puan: 0 = ağrı, 1 = yapamıyor, 2 = kompansasyonla, 3 = mükemmel.
        Bilateral testlerde sol/sağ ayrı puanlanır, toplama düşük olan dahil edilir.
      </p>
      <label className="profile-field">
        <span>Test Tarihi *</span>
        <input
          type="date"
          className="profile-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {FMS_TESTS.map((t) => (
        <div key={t.key} className="fms-test-row">
          <div className="fms-test-label">{t.label}</div>
          {t.bilateral ? (
            <div className="fms-bilateral">
              <FmsScoreSelect
                label="Sol"
                value={String(data[`${t.key}Left`] ?? '')}
                onChange={(v) => setData({ ...data, [`${t.key}Left`]: v })}
              />
              <FmsScoreSelect
                label="Sağ"
                value={String(data[`${t.key}Right`] ?? '')}
                onChange={(v) => setData({ ...data, [`${t.key}Right`]: v })}
              />
            </div>
          ) : (
            <FmsScoreSelect
              label=""
              value={String(data[t.key] ?? '')}
              onChange={(v) => setData({ ...data, [t.key]: v })}
            />
          )}
        </div>
      ))}
      <div className="fms-total">
        <span>Toplam Puan</span>
        <strong>{total} / 21</strong>
      </div>
      <label className="profile-field">
        <span>Notlar</span>
        <textarea
          className="profile-input profile-textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Gözlemler, kompansasyonlar, öneriler..."
        />
      </label>
      <div className="services-form-actions">
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? '⏳' : '💾 Kaydet'}
        </button>
        <button className="btn-outline" onClick={onCancel}>
          İptal
        </button>
      </div>
    </section>
  );
}

function FmsScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="fms-score-group">
      {label && <span className="fms-score-label">{label}</span>}
      <div className="fms-score-buttons">
        {[0, 1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            className={`fms-score-btn fms-score-${s} ${value === String(s) ? 'active' : ''}`}
            onClick={() => onChange(String(s))}
          >
            {s}
          </button>
        ))}
        {value && (
          <button
            type="button"
            className="fms-score-clear"
            onClick={() => onChange('')}
            title="Temizle"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─── VO2 Max Form ──────────────────────
function Vo2Form({
  date,
  setDate,
  data,
  setData,
  notes,
  setNotes,
  onSave,
  onCancel,
  saving,
}: {
  date: string;
  setDate: (v: string) => void;
  data: Record<string, unknown>;
  setData: (d: Record<string, unknown>) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <section className="services-card services-form-card">
      <h3 className="services-form-title">💓 VO2 Max Testi</h3>
      <label className="profile-field">
        <span>Test Tarihi *</span>
        <input
          type="date"
          className="profile-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <div className="services-grid-2">
        <label className="profile-field">
          <span>Protokol</span>
          <select
            className="profile-input"
            value={String(data.protocol ?? 'cooper')}
            onChange={(e) => setData({ ...data, protocol: e.target.value })}
          >
            <option value="cooper">Cooper Testi (12dk koşu)</option>
            <option value="rockport">Rockport Yürüyüş Testi</option>
            <option value="bruce">Bruce Treadmill Protocol</option>
            <option value="step">Step Test</option>
            <option value="custom">Özel</option>
          </select>
        </label>
        <label className="profile-field">
          <span>VO2 Max Skoru (ml/kg/dk)</span>
          <input
            type="number"
            step="0.1"
            className="profile-input"
            value={String(data.score ?? '')}
            onChange={(e) => setData({ ...data, score: parseFloat(e.target.value) || null })}
            placeholder="45"
          />
        </label>
        <label className="profile-field">
          <span>Dinlenme Nabzı (bpm)</span>
          <input
            type="number"
            className="profile-input"
            value={String(data.restingHr ?? '')}
            onChange={(e) =>
              setData({ ...data, restingHr: parseInt(e.target.value) || null })
            }
          />
        </label>
        <label className="profile-field">
          <span>Maksimum Nabız (bpm)</span>
          <input
            type="number"
            className="profile-input"
            value={String(data.maxHr ?? '')}
            onChange={(e) => setData({ ...data, maxHr: parseInt(e.target.value) || null })}
          />
        </label>
        <label className="profile-field">
          <span>Test Mesafesi (m)</span>
          <input
            type="number"
            className="profile-input"
            value={String(data.distanceM ?? '')}
            onChange={(e) =>
              setData({ ...data, distanceM: parseInt(e.target.value) || null })
            }
          />
        </label>
      </div>
      <label className="profile-field">
        <span>Notlar</span>
        <textarea
          className="profile-input profile-textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="services-form-actions">
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? '⏳' : '💾 Kaydet'}
        </button>
        <button className="btn-outline" onClick={onCancel}>
          İptal
        </button>
      </div>
    </section>
  );
}

// ─── Posture Form ──────────────────────
function PostureForm({
  date,
  setDate,
  data,
  setData,
  notes,
  setNotes,
  onSave,
  onCancel,
  saving,
}: {
  date: string;
  setDate: (v: string) => void;
  data: Record<string, unknown>;
  setData: (d: Record<string, unknown>) => void;
  notes: string;
  setNotes: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const front = (data.front ?? {}) as Record<string, string>;
  const side = (data.side ?? {}) as Record<string, string>;
  const back = (data.back ?? {}) as Record<string, string>;

  return (
    <section className="services-card services-form-card">
      <h3 className="services-form-title">🧍 Statik Postür Analizi</h3>
      <label className="profile-field">
        <span>Test Tarihi *</span>
        <input
          type="date"
          className="profile-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
        Önden Görünüm
      </h4>
      <PostureChip
        label="Baş Eğikliği"
        value={front.headTilt}
        options={['düz', 'sol', 'sağ']}
        onChange={(v) => setData({ ...data, front: { ...front, headTilt: v } })}
      />
      <PostureChip
        label="Yüksek Omuz"
        value={front.shoulderHigh}
        options={['düz', 'sol', 'sağ']}
        onChange={(v) => setData({ ...data, front: { ...front, shoulderHigh: v } })}
      />
      <PostureChip
        label="Pelvis Eğikliği"
        value={front.pelvicTilt}
        options={['düz', 'sol', 'sağ']}
        onChange={(v) => setData({ ...data, front: { ...front, pelvicTilt: v } })}
      />

      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Yandan Görünüm</h4>
      <PostureChip
        label="İleri Baş"
        value={side.headForward}
        options={['normal', 'hafif', 'belirgin']}
        onChange={(v) => setData({ ...data, side: { ...side, headForward: v } })}
      />
      <PostureChip
        label="Kifoz"
        value={side.kyphosis}
        options={['normal', 'artmış']}
        onChange={(v) => setData({ ...data, side: { ...side, kyphosis: v } })}
      />
      <PostureChip
        label="Lordoz"
        value={side.lordosis}
        options={['normal', 'artmış', 'azalmış']}
        onChange={(v) => setData({ ...data, side: { ...side, lordosis: v } })}
      />

      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Arkadan Görünüm</h4>
      <PostureChip
        label="Skapula Kanatlanması"
        value={back.scapulaWinging}
        options={['yok', 'var']}
        onChange={(v) => setData({ ...data, back: { ...back, scapulaWinging: v } })}
      />
      <PostureChip
        label="Skolyoz"
        value={back.scoliosis}
        options={['yok', 'sol', 'sağ', 'S']}
        onChange={(v) => setData({ ...data, back: { ...back, scoliosis: v } })}
      />

      <label className="profile-field">
        <span>Genel Notlar</span>
        <textarea
          className="profile-input profile-textarea"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <div className="services-form-actions">
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? '⏳' : '💾 Kaydet'}
        </button>
        <button className="btn-outline" onClick={onCancel}>
          İptal
        </button>
      </div>
    </section>
  );
}

function PostureChip({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="posture-chip-row">
      <span className="posture-chip-label">{label}</span>
      <div className="posture-chip-options">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={`posture-chip ${value === o ? 'active' : ''}`}
            onClick={() => onChange(value === o ? '' : o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Assessment Card (display) ────────
function AssessmentCard({
  assessment: a,
  onDelete,
}: {
  assessment: Assessment;
  onDelete: () => void;
}) {
  const typeLabel =
    a.type === 'fms'
      ? '🏃 FMS Testi'
      : a.type === 'posture'
        ? '🧍 Postür Analizi'
        : a.type === 'vo2_max'
          ? '💓 VO2 Max'
          : a.type;

  // FMS toplam
  let summary = '';
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
    summary = `Toplam: ${total} / 21`;
  } else if (a.type === 'vo2_max') {
    summary = a.data.score ? `${a.data.score} ml/kg/dk` : '';
  }

  return (
    <div className="services-item-card">
      <div className="services-item-header">
        <div>
          <strong>{typeLabel}</strong>
          <span className="services-item-meta">{formatDate(a.assessedAt)}</span>
        </div>
        <button
          className="btn-outline btn-sm services-btn-danger"
          onClick={onDelete}
          style={{ padding: '0.25rem 0.5rem' }}
          title="Sil"
        >
          🗑️
        </button>
      </div>
      {summary && (
        <div className="services-item-price">
          <strong>{summary}</strong>
        </div>
      )}
      {a.notes && <p className="services-item-desc">{a.notes}</p>}
    </div>
  );
}
