import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';

type Student = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  source: string;
  connectedAt: string;
  lastLessonAt: string | null;
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function TrainerStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiJson<Student[]>('/trainer-panel/students');
      setStudents(rows);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)),
    );
  }, [students, search]);

  return (
    <div className="trainer-services">
      <div className="services-header">
        <div>
          <h1>👥 Öğrencilerim</h1>
          <p className="muted">
            Bağlı olduğunuz {students.length} öğrenci. Detayları görmek için bir öğrenciye tıklayın.
          </p>
        </div>
      </div>

      {error && <div className="profile-banner profile-banner-error">⚠️ {error}</div>}

      {students.length > 0 && (
        <div className="students-search-row">
          <input
            type="text"
            className="profile-input"
            placeholder="🔍 Ad, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && students.length === 0 && (
        <div className="services-empty">
          <span className="services-empty-icon">👥</span>
          <p>Henüz bağlı öğrenciniz yok.</p>
          <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 400 }}>
            Ajanda sayfasından bir öğrenciye ders oluşturduğunuzda otomatik bağlanır. Üyeleri kulüp
            havuzundan seçebilirsiniz.
          </p>
          <Link to="/trainer/agenda" className="btn-primary" style={{ marginTop: '0.75rem' }}>
            📅 Ajandaya Git
          </Link>
        </div>
      )}

      {!loading && filteredStudents.length === 0 && students.length > 0 && (
        <p className="muted">Aramayla eşleşen öğrenci yok.</p>
      )}

      {filteredStudents.length > 0 && (
        <div className="students-grid">
          {filteredStudents.map((s) => (
            <Link
              key={s.userId}
              to={`/trainer/students/${s.userId}`}
              className="student-card"
            >
              <div className="student-card-photo">
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt={`${s.firstName} ${s.lastName}`} />
                ) : (
                  <span>{s.firstName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="student-card-info">
                <strong>
                  {s.firstName} {s.lastName}
                </strong>
                <span className="student-card-email">{s.email}</span>
                {s.phone && <span className="student-card-phone">📞 {s.phone}</span>}
              </div>
              <div className="student-card-meta">
                <span className="student-card-meta-label">Son ders</span>
                <span className="student-card-meta-value">{formatDate(s.lastLessonAt)}</span>
              </div>
              <span className="student-card-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
