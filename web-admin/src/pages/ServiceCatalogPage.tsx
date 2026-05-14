import { useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';
import { readStoredTenantSubdomain } from '../auth/storage';

type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  providerType: string;
  providerId: string | null;
  providerName: string | null;
  durationMinutes: number;
  price: string;
  currency: string;
  capacity: number;
};

const CATEGORIES = [
  { value: 'personal_training', label: '🏋️ Personal Training' },
  { value: 'massage', label: '💆 Masaj' },
  { value: 'court_rental', label: '🎾 Kort Kiralama' },
  { value: 'group_class', label: '👥 Grup Dersi' },
  { value: 'event', label: '📅 Etkinlik' },
  { value: 'other', label: '📦 Diğer' },
];

export function ServiceCatalogPage() {
  const subdomain = readStoredTenantSubdomain() || '';
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'personal_training',
    providerType: 'trainer',
    durationMinutes: '60',
    price: '',
    currency: 'TRY',
    capacity: '1',
  });

  useEffect(() => {
    if (!subdomain) return;
    let cancelled = false;
    apiJson<Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}`)
      .then((data) => {
        if (!cancelled) {
          setServices(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  async function handleCreate() {
    if (!form.name.trim() || !form.price.trim()) return;
    setSaving(true);
    try {
      await apiJson('/v2/services', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          category: form.category,
          providerType: form.providerType,
          durationMinutes: parseInt(form.durationMinutes) || 60,
          price: parseFloat(form.price),
          currency: form.currency,
          capacity: parseInt(form.capacity) || 1,
        }),
      });
      setShowForm(false);
      setForm({
        name: '',
        description: '',
        category: 'personal_training',
        providerType: 'trainer',
        durationMinutes: '60',
        price: '',
        currency: 'TRY',
        capacity: '1',
      });
      // Reload services
      const data = await apiJson<Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}`);
      setServices(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Hizmet oluşturulamadı');
    } finally {
      setSaving(false);
    }
  }

  const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <AdminLayout>
      <div style={{ padding: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>📋 Hizmet Kataloğu</h1>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              Kulübünüzün sunduğu hizmetleri yönetin.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '0.7rem 1.2rem',
              borderRadius: 10,
              border: 'none',
              background: '#38bdf8',
              color: '#0a0f1a',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showForm ? '✕ Kapat' : '+ Yeni Hizmet'}
          </button>
        </div>

        {showForm && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 14,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(148,163,184,0.2)',
              marginBottom: '1.5rem',
            }}
          >
            <h3 style={{ margin: '0 0 1rem', color: '#e2e8f0' }}>Yeni Hizmet Ekle</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Hizmet Adı *
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="ör. Personal Training 1 Seans"
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Kategori
                </span>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Fiyat (₺) *
                </span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  placeholder="1500"
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Süre (dk)
                </span>
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Kapasite
                </span>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Sağlayıcı Tipi
                </span>
                <select
                  value={form.providerType}
                  onChange={(e) => setForm((p) => ({ ...p, providerType: e.target.value }))}
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                  }}
                >
                  <option value="trainer">Eğitmen</option>
                  <option value="therapist">Terapist</option>
                  <option value="resource">Kaynak (Kort vb.)</option>
                </select>
              </label>
              <label
                style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: '1 / -1' }}
              >
                <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                  Açıklama
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Hizmet açıklaması (opsiyonel)"
                  style={{
                    padding: '0.6rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#e2e8f0',
                    resize: 'vertical',
                  }}
                />
              </label>
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim() || !form.price.trim()}
              style={{
                marginTop: '1rem',
                padding: '0.7rem 1.5rem',
                borderRadius: 10,
                border: 'none',
                background: '#10b981',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Kaydediliyor...' : '✓ Hizmet Oluştur'}
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Yükleniyor...</p>
        ) : services.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Henüz hizmet tanımlanmamış.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {services.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 12,
                  background: 'rgba(15,23,42,0.4)',
                  border: '1px solid rgba(148,163,184,0.15)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        background: 'rgba(148,163,184,0.1)',
                        padding: '2px 8px',
                        borderRadius: 6,
                      }}
                    >
                      {categoryLabel(s.category)}
                    </span>
                    <strong style={{ color: '#e2e8f0' }}>{s.name}</strong>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    {s.durationMinutes} dk · Kapasite: {s.capacity} ·{' '}
                    {s.providerName || s.providerType}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                    {parseFloat(s.price).toLocaleString('tr-TR')}₺
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.currency}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
