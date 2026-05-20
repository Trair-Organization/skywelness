import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

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

type AvailableMember = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  linked: boolean;
};

type SearchResultUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  photoUrl: string | null;
  isLinked: boolean;
};

type AddTab = 'club' | 'search' | 'external' | 'invite';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

export function TrainerStudentsPage() {
  const { user } = useAuth();
  const isIndependentTrainer = user?.role === 'independent_trainer';

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('club');

  // Tab 1: Club members
  const [clubMembers, setClubMembers] = useState<AvailableMember[]>([]);
  const [clubMembersLoading, setClubMembersLoading] = useState(false);
  const [clubSearch, setClubSearch] = useState('');

  // Tab 2: System search
  const [systemQuery, setSystemQuery] = useState('');
  const [systemResults, setSystemResults] = useState<SearchResultUser[]>([]);
  const [systemSearching, setSystemSearching] = useState(false);

  // Tab 3: External
  const [extForm, setExtForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [extSaving, setExtSaving] = useState(false);

  // Tab 4: Invite
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Add action
  const [addingId, setAddingId] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 2500);
  };
  const flashErr = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

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

  // Tab content loaders
  const loadClubMembers = useCallback(async () => {
    setClubMembersLoading(true);
    try {
      const rows = await apiJson<AvailableMember[]>('/trainer-panel/available-members');
      setClubMembers(rows);
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Üyeler yüklenemedi');
    } finally {
      setClubMembersLoading(false);
    }
  }, []);

  const loadInviteCode = useCallback(async () => {
    setInviteLoading(true);
    try {
      const res = await apiJson<{ inviteCode: string }>('/trainer-panel/invite-code');
      setInviteCode(res.inviteCode);
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Davet kodu alınamadı');
    } finally {
      setInviteLoading(false);
    }
  }, []);

  // System search debounce
  useEffect(() => {
    if (addTab !== 'search' || !showAddModal) return;
    const q = systemQuery.trim();
    if (q.length < 3) {
      setSystemResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSystemSearching(true);
      try {
        const res = await apiJson<{ results: SearchResultUser[] }>(
          `/trainer-panel/students/search?q=${encodeURIComponent(q)}`,
        );
        setSystemResults(res.results || []);
      } catch {
        setSystemResults([]);
      } finally {
        setSystemSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [systemQuery, addTab, showAddModal]);

  // Modal opening
  function openAddModal() {
    setShowAddModal(true);
    setAddTab(isIndependentTrainer ? 'search' : 'club');
    if (!isIndependentTrainer) void loadClubMembers();
  }

  // Tab navigation
  function selectTab(tab: AddTab) {
    setAddTab(tab);
    if (tab === 'club' && clubMembers.length === 0) void loadClubMembers();
    if (tab === 'invite' && !inviteCode) void loadInviteCode();
  }

  // Actions
  async function addById(userId: string, displayName: string) {
    setAddingId(userId);
    try {
      await apiJson('/trainer-panel/students/add-by-id', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      flash(`✅ ${displayName} öğrencileriniz arasına eklendi`);
      // Listeyi yenile
      await load();
      // Modal listesinde de güncelle
      setClubMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, linked: true } : m)));
      setSystemResults((prev) => prev.map((u) => (u.id === userId ? { ...u, isLinked: true } : u)));
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Eklenemedi');
    } finally {
      setAddingId(null);
    }
  }

  async function addExternalStudent() {
    const { firstName, lastName, email, phone } = extForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      flashErr('Tüm alanlar zorunludur');
      return;
    }
    setExtSaving(true);
    try {
      await apiJson('/trainer-panel/students/add-external', {
        method: 'POST',
        body: JSON.stringify(extForm),
      });
      flash(`✅ ${firstName} ${lastName} bireysel öğrenci olarak eklendi`);
      setExtForm({ firstName: '', lastName: '', email: '', phone: '' });
      await load();
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Eklenemedi');
    } finally {
      setExtSaving(false);
    }
  }

  async function copyInviteCode() {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      flash('✅ Davet kodu panoya kopyalandı');
    } catch {
      flashErr('Kopyalanamadı');
    }
  }

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

  const filteredClubMembers = useMemo(() => {
    const q = clubSearch.trim().toLowerCase();
    if (!q) return clubMembers;
    return clubMembers.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [clubMembers, clubSearch]);

  return (
    <div className="trainer-services">
      <div className="services-header">
        <div>
          <h1>👥 Öğrencilerim</h1>
          <p className="muted">
            Bağlı olduğunuz {students.length} öğrenci. Detayları görmek için bir öğrenciye tıklayın.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openAddModal}>
          + Öğrenci Ekle
        </button>
      </div>

      {error && <div className="profile-banner profile-banner-error">⚠️ {error}</div>}
      {success && <div className="profile-banner profile-banner-success">{success}</div>}

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
          <p className="muted" style={{ fontSize: '0.85rem', maxWidth: 480 }}>
            <strong>+ Öğrenci Ekle</strong> butonuyla kulüp üyelerinden seçebilir, sistemde ara
            yaparak ekleyebilir, kişisel öğrencilerinizi manuel olarak ekleyebilir veya davet kodu
            paylaşarak öğrencinin kendi bağlanmasını sağlayabilirsiniz.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={openAddModal}>
              + Öğrenci Ekle
            </button>
            <Link to="/trainer/agenda" className="btn-outline">
              📅 Ajandaya Git
            </Link>
          </div>
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

      {/* + Öğrenci Ekle Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content add-student-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>+ Öğrenci Ekle</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label="Kapat"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="add-student-tabs">
              {!isIndependentTrainer && (
                <button
                  type="button"
                  className={`add-student-tab ${addTab === 'club' ? 'active' : ''}`}
                  onClick={() => selectTab('club')}
                >
                  🏢 Kulüp Üyeleri
                </button>
              )}
              <button
                type="button"
                className={`add-student-tab ${addTab === 'search' ? 'active' : ''}`}
                onClick={() => selectTab('search')}
              >
                🔍 Sistemde Ara
              </button>
              <button
                type="button"
                className={`add-student-tab ${addTab === 'external' ? 'active' : ''}`}
                onClick={() => selectTab('external')}
              >
                👤 Bireysel
              </button>
              <button
                type="button"
                className={`add-student-tab ${addTab === 'invite' ? 'active' : ''}`}
                onClick={() => selectTab('invite')}
              >
                🔗 Davet Kodu
              </button>
            </div>

            <div className="add-student-body">
              {/* Tab 1: Club members */}
              {addTab === 'club' && (
                <div>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Kulübünüzün aktif üyeleri arasından öğrenci seçin. Henüz size bağlı olmayanları
                    ekleyebilirsiniz.
                  </p>
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="🔍 İsim veya e-posta ile filtrele..."
                    value={clubSearch}
                    onChange={(e) => setClubSearch(e.target.value)}
                    style={{ marginBottom: '0.75rem' }}
                  />
                  {clubMembersLoading ? (
                    <p className="muted">Yükleniyor...</p>
                  ) : filteredClubMembers.length === 0 ? (
                    <p className="muted">
                      {clubMembers.length === 0
                        ? 'Kulübünüzde aktif üye yok.'
                        : 'Aramayla eşleşen üye yok.'}
                    </p>
                  ) : (
                    <div className="add-student-list">
                      {filteredClubMembers.map((m) => (
                        <div key={m.userId} className="add-student-row">
                          <div className="add-student-avatar">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt="" />
                            ) : (
                              <span>{m.firstName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="add-student-info">
                            <strong>
                              {m.firstName} {m.lastName}
                            </strong>
                            <span className="muted">{m.email}</span>
                          </div>
                          {m.linked ? (
                            <span className="add-student-badge">Bağlı</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              disabled={addingId === m.userId}
                              onClick={() =>
                                void addById(m.userId, `${m.firstName} ${m.lastName}`)
                              }
                            >
                              {addingId === m.userId ? '...' : '+ Ekle'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: System search */}
              {addTab === 'search' && (
                <div>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Platformdaki tüm üyeleri kullanıcı adı veya e-posta ile arayın. Sonuçları
                    seçerek öğrenci olarak ekleyebilirsiniz.
                  </p>
                  <input
                    type="text"
                    className="profile-input"
                    placeholder="🔍 En az 3 karakter (kullanıcı adı, e-posta)..."
                    value={systemQuery}
                    onChange={(e) => setSystemQuery(e.target.value)}
                    style={{ marginBottom: '0.75rem' }}
                  />
                  {systemSearching && <p className="muted">Aranıyor...</p>}
                  {!systemSearching &&
                    systemQuery.trim().length < 3 && (
                      <p className="muted">Aramaya başlamak için en az 3 karakter yazın.</p>
                    )}
                  {!systemSearching && systemQuery.trim().length >= 3 && systemResults.length === 0 && (
                    <p className="muted">Sonuç bulunamadı.</p>
                  )}
                  {systemResults.length > 0 && (
                    <div className="add-student-list">
                      {systemResults.map((u) => (
                        <div key={u.id} className="add-student-row">
                          <div className="add-student-avatar">
                            {u.photoUrl ? (
                              <img src={u.photoUrl} alt="" />
                            ) : (
                              <span>{u.firstName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="add-student-info">
                            <strong>
                              {u.firstName} {u.lastName}
                            </strong>
                            <span className="muted">
                              @{u.username} · {u.email}
                            </span>
                          </div>
                          {u.isLinked ? (
                            <span className="add-student-badge">Bağlı</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-sm btn-outline"
                              disabled={addingId === u.id}
                              onClick={() => void addById(u.id, `${u.firstName} ${u.lastName}`)}
                            >
                              {addingId === u.id ? '...' : '+ Ekle'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: External */}
              {addTab === 'external' && (
                <div>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Sistemde olmayan kişisel öğrencinizi manuel ekleyin. Kayıt oluşturulur ve size
                    bağlanır. Öğrenci daha sonra mailini kullanarak hesabını aktive edebilir.
                  </p>
                  <div className="services-form-grid">
                    <label className="profile-field">
                      <span>Ad *</span>
                      <input
                        type="text"
                        className="profile-input"
                        value={extForm.firstName}
                        onChange={(e) =>
                          setExtForm({ ...extForm, firstName: e.target.value })
                        }
                        placeholder="Ahmet"
                      />
                    </label>
                    <label className="profile-field">
                      <span>Soyad *</span>
                      <input
                        type="text"
                        className="profile-input"
                        value={extForm.lastName}
                        onChange={(e) => setExtForm({ ...extForm, lastName: e.target.value })}
                        placeholder="Yılmaz"
                      />
                    </label>
                    <label className="profile-field" style={{ gridColumn: '1 / -1' }}>
                      <span>E-posta *</span>
                      <input
                        type="email"
                        className="profile-input"
                        value={extForm.email}
                        onChange={(e) => setExtForm({ ...extForm, email: e.target.value })}
                        placeholder="ahmet@ornek.com"
                      />
                    </label>
                    <label className="profile-field" style={{ gridColumn: '1 / -1' }}>
                      <span>Telefon *</span>
                      <input
                        type="tel"
                        className="profile-input"
                        value={extForm.phone}
                        onChange={(e) => setExtForm({ ...extForm, phone: e.target.value })}
                        placeholder="+90 555 123 4567"
                      />
                    </label>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setShowAddModal(false)}
                      disabled={extSaving}
                    >
                      Kapat
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => void addExternalStudent()}
                      disabled={extSaving}
                    >
                      {extSaving ? '⏳ Ekleniyor...' : '✓ Öğrenci Olarak Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Invite Code */}
              {addTab === 'invite' && (
                <div>
                  <p className="muted" style={{ marginTop: 0 }}>
                    Davet kodunuzu öğrencinizle paylaşın. Üye uygulamada bu kodu girerek size
                    bağlanabilir.
                  </p>
                  {inviteLoading ? (
                    <p className="muted">Yükleniyor...</p>
                  ) : inviteCode ? (
                    <div className="invite-code-box">
                      <div className="invite-code-display">{inviteCode}</div>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => void copyInviteCode()}
                      >
                        📋 Panoya Kopyala
                      </button>
                    </div>
                  ) : (
                    <p className="muted">Davet kodu alınamadı.</p>
                  )}
                  <div className="invite-instructions">
                    <h4>Öğrenciniz nasıl kullanır?</h4>
                    <ol>
                      <li>Mobil uygulamayı indir ve hesap oluştur</li>
                      <li>Profil → Eğitmen Bağla</li>
                      <li>Davet kodunu gir → otomatik size bağlanır</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
