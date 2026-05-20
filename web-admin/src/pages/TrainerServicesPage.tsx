import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  capacity: number;
  active: boolean;
};

type PackageRow = {
  id: string;
  name: string;
  sessionCount: number;
  price: string;
  validityDays: number;
  sessionType: string;
  active: boolean;
};

type ProfileMini = {
  defaultLessonPrice: string;
  commissionRate: string;
  commissionPercent?: string;
};

type Tab = 'pricing' | 'packages' | 'services';

function formatTRY(amount: string | number) {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(n);
}

export function TrainerServicesPage() {
  const [tab, setTab] = useState<Tab>('pricing');
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [profile, setProfile] = useState<ProfileMini | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pricing
  const [defaultPrice, setDefaultPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  // Service form
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sDuration, setSDuration] = useState('60');
  const [sPrice, setSPrice] = useState('');
  const [sCapacity, setSCapacity] = useState('1');
  const [sSaving, setSSaving] = useState(false);

  // Package form
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [pName, setPName] = useState('');
  const [pSessions, setPSessions] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDays, setPDays] = useState('30');
  const [pType, setPType] = useState('personal_training');
  const [pSaving, setPSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, prof] = await Promise.all([
        apiJson<ServiceRow[]>('/trainer-panel/services'),
        apiJson<PackageRow[]>('/trainer-panel/packages'),
        apiJson<ProfileMini>('/trainer-panel/profile'),
      ]);
      setServices(s);
      setPackages(p);
      setProfile(prof);
      setDefaultPrice(prof.defaultLessonPrice ?? '1000');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // ─── Pricing ─────────────────────────────
  async function handleSavePrice() {
    const price = parseFloat(defaultPrice);
    if (isNaN(price) || price < 0) return flashErr('Geçersiz fiyat');
    setSavingPrice(true);
    try {
      await apiJson('/trainer-panel/profile', {
        method: 'PATCH',
        body: JSON.stringify({ defaultLessonPrice: price }),
      });
      await load();
      flash('✅ Ders ücreti güncellendi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    } finally {
      setSavingPrice(false);
    }
  }

  // ─── Services ─────────────────────────────
  function resetServiceForm() {
    setShowServiceForm(false);
    setEditingServiceId(null);
    setSName('');
    setSDesc('');
    setSDuration('60');
    setSPrice('');
    setSCapacity('1');
  }
  function startEditService(s: ServiceRow) {
    setEditingServiceId(s.id);
    setSName(s.name);
    setSDesc(s.description ?? '');
    setSDuration(String(s.durationMinutes));
    setSPrice(s.price);
    setSCapacity(String(s.capacity));
    setShowServiceForm(true);
  }
  async function handleSaveService() {
    if (!sName.trim() || !sPrice) return flashErr('Ad ve fiyat zorunlu');
    setSSaving(true);
    try {
      const body = {
        name: sName.trim(),
        description: sDesc.trim() || undefined,
        durationMinutes: parseInt(sDuration) || 60,
        price: parseFloat(sPrice),
        capacity: parseInt(sCapacity) || 1,
      };
      if (editingServiceId) {
        await apiJson(`/trainer-panel/services/${editingServiceId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        flash('✅ Hizmet güncellendi');
      } else {
        await apiJson('/trainer-panel/services', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        flash('✅ Hizmet eklendi');
      }
      resetServiceForm();
      await load();
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    } finally {
      setSSaving(false);
    }
  }
  async function handleDeleteService(id: string) {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/services/${id}`, { method: 'DELETE' });
      await load();
      flash('✅ Hizmet silindi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Silinemedi');
    }
  }

  // ─── Packages ─────────────────────────────
  function resetPackageForm() {
    setShowPackageForm(false);
    setEditingPackageId(null);
    setPName('');
    setPSessions('');
    setPPrice('');
    setPDays('30');
    setPType('personal_training');
  }
  function startEditPackage(p: PackageRow) {
    setEditingPackageId(p.id);
    setPName(p.name);
    setPSessions(String(p.sessionCount));
    setPPrice(p.price);
    setPDays(String(p.validityDays));
    setPType(p.sessionType);
    setShowPackageForm(true);
  }
  async function handleSavePackage() {
    if (!pName.trim() || !pSessions || !pPrice) return flashErr('Tüm alanlar zorunlu');
    setPSaving(true);
    try {
      const body = {
        name: pName.trim(),
        sessionCount: parseInt(pSessions),
        price: parseFloat(pPrice),
        validityDays: parseInt(pDays) || 30,
        sessionType: pType,
      };
      if (editingPackageId) {
        await apiJson(`/trainer-panel/packages/${editingPackageId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        flash('✅ Paket güncellendi');
      } else {
        await apiJson('/trainer-panel/packages', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        flash('✅ Paket eklendi');
      }
      resetPackageForm();
      await load();
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Kaydedilemedi');
    } finally {
      setPSaving(false);
    }
  }
  async function handleDeletePackage(id: string) {
    if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/packages/${id}`, { method: 'DELETE' });
      await load();
      flash('✅ Paket silindi');
    } catch (e) {
      flashErr(e instanceof ApiError ? e.message : 'Silinemedi');
    }
  }

  const commissionPct = profile
    ? `%${(parseFloat(profile.commissionRate) * 100).toFixed(1)}`
    : '%7';

  return (
    <div className="trainer-services">
      <div className="services-header">
        <div>
          <h1>📦 Hizmet & Paket</h1>
          <p className="muted">
            Ders ücretinizi, paketlerinizi ve özel hizmetlerinizi yönetin.
          </p>
        </div>
      </div>

      {error && <div className="profile-banner profile-banner-error">⚠️ {error}</div>}
      {success && <div className="profile-banner profile-banner-success">{success}</div>}

      {/* Tabs */}
      <div className="services-tabs">
        <button
          type="button"
          className={`services-tab ${tab === 'pricing' ? 'active' : ''}`}
          onClick={() => setTab('pricing')}
        >
          💰 Ders Ücreti
        </button>
        <button
          type="button"
          className={`services-tab ${tab === 'packages' ? 'active' : ''}`}
          onClick={() => setTab('packages')}
        >
          💎 Paketlerim
          {packages.length > 0 && (
            <span className="services-tab-count">{packages.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`services-tab ${tab === 'services' ? 'active' : ''}`}
          onClick={() => setTab('services')}
        >
          🏋️ Özel Hizmetler
          {services.length > 0 && (
            <span className="services-tab-count">{services.length}</span>
          )}
        </button>
      </div>

      {loading && <p className="muted">Yükleniyor...</p>}

      {/* ─── PRICING TAB ─── */}
      {!loading && tab === 'pricing' && (
        <section className="services-card">
          <h2 className="services-card-title">💰 Standart Ders Ücretim</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>
            Bu fiyat tamamlanan derslerinizden gelir hesaplanmasında kullanılır.
            Platform komisyonu <strong>{commissionPct}</strong> otomatik düşülür.
          </p>

          <div className="pricing-input-row">
            <label className="profile-field" style={{ flex: 1 }}>
              <span>Ders Ücreti (TRY)</span>
              <input
                type="number"
                className="profile-input"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                min={0}
                step={50}
                placeholder="1000"
              />
            </label>
            <button
              className="btn-primary"
              onClick={() => void handleSavePrice()}
              disabled={savingPrice}
              style={{ alignSelf: 'flex-end', height: 42 }}
            >
              {savingPrice ? '⏳' : '💾 Kaydet'}
            </button>
          </div>

          {defaultPrice && parseFloat(defaultPrice) > 0 && profile && (
            <div className="pricing-preview">
              <div className="pricing-preview-row">
                <span>Brüt ders ücreti</span>
                <strong>{formatTRY(defaultPrice)}</strong>
              </div>
              <div className="pricing-preview-row platform-fee">
                <span>Platform komisyonu ({commissionPct})</span>
                <strong>
                  − {formatTRY(parseFloat(defaultPrice) * parseFloat(profile.commissionRate))}
                </strong>
              </div>
              <div className="pricing-preview-row net">
                <span>Net kazancım</span>
                <strong>
                  {formatTRY(
                    parseFloat(defaultPrice) * (1 - parseFloat(profile.commissionRate)),
                  )}
                </strong>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── PACKAGES TAB ─── */}
      {!loading && tab === 'packages' && (
        <>
          <div className="services-tab-header">
            <h2 className="services-card-title" style={{ margin: 0 }}>
              💎 PT Paketlerim
            </h2>
            <button
              className="btn-primary"
              onClick={() => {
                resetPackageForm();
                setShowPackageForm(true);
              }}
            >
              + Yeni Paket
            </button>
          </div>

          {showPackageForm && (
            <section className="services-card services-form-card">
              <h3 className="services-form-title">
                {editingPackageId ? '✏️ Paketi Düzenle' : '➕ Yeni Paket'}
              </h3>
              <div className="services-grid-2">
                <label className="profile-field">
                  <span>Paket Adı *</span>
                  <input
                    type="text"
                    className="profile-input"
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="Örn: 10 Seans PT"
                  />
                </label>
                <label className="profile-field">
                  <span>Hizmet Türü</span>
                  <select
                    className="profile-input"
                    value={pType}
                    onChange={(e) => setPType(e.target.value)}
                  >
                    <option value="personal_training">🏋️ Personal Training</option>
                    <option value="massage">💆 Masaj</option>
                  </select>
                </label>
              </div>
              <div className="services-grid-3">
                <label className="profile-field">
                  <span>Seans Sayısı *</span>
                  <input
                    type="number"
                    className="profile-input"
                    value={pSessions}
                    onChange={(e) => setPSessions(e.target.value)}
                    min={1}
                    placeholder="10"
                  />
                </label>
                <label className="profile-field">
                  <span>Toplam Fiyat (TRY) *</span>
                  <input
                    type="number"
                    className="profile-input"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    min={0}
                    step={50}
                    placeholder="9000"
                  />
                </label>
                <label className="profile-field">
                  <span>Geçerlilik (gün)</span>
                  <input
                    type="number"
                    className="profile-input"
                    value={pDays}
                    onChange={(e) => setPDays(e.target.value)}
                    min={1}
                    placeholder="30"
                  />
                </label>
              </div>
              {pPrice && pSessions && (
                <p className="services-preview-text">
                  Seans başı:{' '}
                  <strong>
                    {formatTRY(parseFloat(pPrice) / parseInt(pSessions || '1'))}
                  </strong>
                </p>
              )}
              <div className="services-form-actions">
                <button
                  className="btn-primary"
                  onClick={() => void handleSavePackage()}
                  disabled={pSaving}
                >
                  {pSaving ? '⏳' : editingPackageId ? '💾 Güncelle' : '✓ Oluştur'}
                </button>
                <button className="btn-outline" onClick={resetPackageForm}>
                  İptal
                </button>
              </div>
            </section>
          )}

          {packages.length === 0 ? (
            <div className="services-empty">
              <span className="services-empty-icon">💎</span>
              <p>Henüz paket oluşturmadınız.</p>
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Paketler öğrencilerinize sunduğunuz seanslı PT teklifleridir. Daha düşük seans başı
                fiyatla satarak portföyünüzü büyütebilirsiniz.
              </p>
            </div>
          ) : (
            <div className="services-grid-cards">
              {packages.map((p) => {
                const perSession = parseFloat(p.price) / p.sessionCount;
                return (
                  <div key={p.id} className="services-item-card">
                    <div className="services-item-header">
                      <div>
                        <strong>{p.name}</strong>
                        <span className="services-item-meta">
                          {p.sessionCount} seans · {p.validityDays} gün geçerli
                        </span>
                      </div>
                      <span
                        className={`services-status-badge ${p.active ? 'active' : 'inactive'}`}
                      >
                        {p.active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="services-item-price">
                      <strong>{formatTRY(p.price)}</strong>
                      <span>{formatTRY(perSession)} / seans</span>
                    </div>
                    <div className="services-item-actions">
                      <button className="btn-outline btn-sm" onClick={() => startEditPackage(p)}>
                        ✏️ Düzenle
                      </button>
                      <button
                        className="btn-outline btn-sm services-btn-danger"
                        onClick={() => void handleDeletePackage(p.id)}
                      >
                        🗑️ Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── SERVICES TAB ─── */}
      {!loading && tab === 'services' && (
        <>
          <div className="services-tab-header">
            <h2 className="services-card-title" style={{ margin: 0 }}>
              🏋️ Özel Hizmetlerim
            </h2>
            <button
              className="btn-primary"
              onClick={() => {
                resetServiceForm();
                setShowServiceForm(true);
              }}
            >
              + Yeni Hizmet
            </button>
          </div>

          <p className="muted services-tab-info">
            Standart PT dersi dışında verdiğiniz özel hizmetler (örn. ölçüm seansı, beslenme
            danışmanlığı, online program) buraya eklenebilir.
          </p>

          {showServiceForm && (
            <section className="services-card services-form-card">
              <h3 className="services-form-title">
                {editingServiceId ? '✏️ Hizmeti Düzenle' : '➕ Yeni Hizmet'}
              </h3>
              <label className="profile-field">
                <span>Hizmet Adı *</span>
                <input
                  type="text"
                  className="profile-input"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="Örn: Vücut Analizi & Ölçüm"
                />
              </label>
              <label className="profile-field">
                <span>Açıklama</span>
                <textarea
                  className="profile-input profile-textarea"
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  rows={3}
                  placeholder="Hizmet detayı, ne içerdiği..."
                />
              </label>
              <div className="services-grid-3">
                <label className="profile-field">
                  <span>Süre (dk)</span>
                  <input
                    type="number"
                    className="profile-input"
                    value={sDuration}
                    onChange={(e) => setSDuration(e.target.value)}
                    min={15}
                    step={15}
                  />
                </label>
                <label className="profile-field">
                  <span>Fiyat (TRY) *</span>
                  <input
                    type="number"
                    className="profile-input"
                    value={sPrice}
                    onChange={(e) => setSPrice(e.target.value)}
                    min={0}
                    step={50}
                  />
                </label>
                <label className="profile-field">
                  <span>Kapasite</span>
                  <input
                    type="number"
                    className="profile-input"
                    value={sCapacity}
                    onChange={(e) => setSCapacity(e.target.value)}
                    min={1}
                  />
                </label>
              </div>
              <div className="services-form-actions">
                <button
                  className="btn-primary"
                  onClick={() => void handleSaveService()}
                  disabled={sSaving}
                >
                  {sSaving ? '⏳' : editingServiceId ? '💾 Güncelle' : '✓ Oluştur'}
                </button>
                <button className="btn-outline" onClick={resetServiceForm}>
                  İptal
                </button>
              </div>
            </section>
          )}

          {services.length === 0 ? (
            <div className="services-empty">
              <span className="services-empty-icon">🏋️</span>
              <p>Henüz özel hizmet eklemediniz.</p>
            </div>
          ) : (
            <div className="services-grid-cards">
              {services.map((s) => (
                <div key={s.id} className="services-item-card">
                  <div className="services-item-header">
                    <div>
                      <strong>{s.name}</strong>
                      <span className="services-item-meta">
                        {s.durationMinutes} dk · {s.capacity} kişi
                      </span>
                    </div>
                    <span
                      className={`services-status-badge ${s.active ? 'active' : 'inactive'}`}
                    >
                      {s.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  {s.description && <p className="services-item-desc">{s.description}</p>}
                  <div className="services-item-price">
                    <strong>{formatTRY(s.price)}</strong>
                  </div>
                  <div className="services-item-actions">
                    <button className="btn-outline btn-sm" onClick={() => startEditService(s)}>
                      ✏️ Düzenle
                    </button>
                    <button
                      className="btn-outline btn-sm services-btn-danger"
                      onClick={() => void handleDeleteService(s.id)}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
