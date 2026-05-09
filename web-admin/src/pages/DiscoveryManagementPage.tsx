import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiJson, ApiError } from '../lib/api';

type Club = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  services: string[];
  priceRange: string | null;
  featured: boolean;
  phone: string | null;
  email: string | null;
};

export function DiscoveryManagementPage() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [editClub, setEditClub] = useState<Club | null>(null);
  const [form, setForm] = useState({
    description: '',
    location: '',
    logoUrl: '',
    coverImageUrl: '',
    services: '',
    priceRange: '',
    phone: '',
    email: '',
    featured: false,
  });
  const [saving, setSaving] = useState(false);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiJson<Club[]>('/discovery/clubs?limit=50');
      setClubs(rows);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadClubs();
    });
  }, [loadClubs]);

  const openEdit = (club: Club) => {
    setEditClub(club);
    setForm({
      description: club.description ?? '',
      location: club.location ?? '',
      logoUrl: club.logoUrl ?? '',
      coverImageUrl: club.coverImageUrl ?? '',
      services: (club.services ?? []).join(', '),
      priceRange: club.priceRange ?? '',
      phone: club.phone ?? '',
      email: club.email ?? '',
      featured: club.featured,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClub) return;
    setSaving(true);
    try {
      await apiJson(`/platform-admin/tenants/${editClub.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: form.description || null,
          location: form.location || null,
          logoUrl: form.logoUrl || null,
          coverImageUrl: form.coverImageUrl || null,
          services: form.services
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          priceRange: form.priceRange || null,
          phone: form.phone || null,
          email: form.email || null,
          featured: form.featured,
        }),
      });
      setEditClub(null);
      await loadClubs();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (field: 'logoUrl' | 'coverImageUrl', file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100/api/v1').replace(
        '/api/v1',
        '',
      );
      const res = await fetch(baseUrl + '/api/v1/auth/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        const fullUrl = body.url.startsWith('http') ? body.url : `${baseUrl}${body.url}`;
        setForm((prev) => ({ ...prev, [field]: fullUrl }));
      }
    } catch {
      alert('Görsel yüklenemedi');
    }
  };

  const isPlatformAdmin = user?.role === 'platform_admin';

  return (
    <div className="shell">
      <div className="page-header">
        <h1>🌐 Keşif Ekranı Yönetimi</h1>
        <p className="muted">Kulüplerin keşif ekranında nasıl göründüğünü yönetin.</p>
      </div>

      {editClub && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>✏️ {editClub.name} — Keşif Bilgileri</h3>
          <form onSubmit={handleSave} className="form-grid">
            <label>
              Açıklama
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Kulüp hakkında kısa tanıtım..."
              />
            </label>
            <label>
              Konum
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="İstanbul · Skyland"
              />
            </label>
            <label>
              Logo
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload('logoUrl', f);
                  }}
                />
                {form.logoUrl && (
                  <img src={form.logoUrl} alt="Logo" style={{ height: 40, borderRadius: 8 }} />
                )}
              </div>
            </label>
            <label>
              Kapak Görseli
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload('coverImageUrl', f);
                  }}
                />
                {form.coverImageUrl && (
                  <img
                    src={form.coverImageUrl}
                    alt="Cover"
                    style={{ height: 60, borderRadius: 8 }}
                  />
                )}
              </div>
            </label>
            <label>
              Hizmetler (virgülle ayır)
              <input
                value={form.services}
                onChange={(e) => setForm({ ...form, services: e.target.value })}
                placeholder="Fitness, Yoga, Pilates, Masaj, Cafe"
              />
            </label>
            <label>
              Fiyat Aralığı
              <input
                value={form.priceRange}
                onChange={(e) => setForm({ ...form, priceRange: e.target.value })}
                placeholder="₺2.000 - ₺8.000 / ay"
              />
            </label>
            <label>
              Telefon
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+90 212 xxx xx xx"
              />
            </label>
            <label>
              E-posta
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="info@club.com"
              />
            </label>
            {isPlatformAdmin && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                />
                Keşif ekranında öne çıkar
              </label>
            )}
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button type="button" className="secondary" onClick={() => setEditClub(null)}>
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kulüp</th>
                <th>Konum</th>
                <th>Hizmetler</th>
                <th>Öne Çıkan</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((club) => (
                <tr key={club.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {club.logoUrl && (
                        <img
                          src={club.logoUrl}
                          alt=""
                          style={{ width: 28, height: 28, borderRadius: 6 }}
                        />
                      )}
                      <div>
                        <strong>{club.name}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          @{club.subdomain}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{club.location ?? <span className="muted">—</span>}</td>
                  <td>{(club.services ?? []).join(', ') || <span className="muted">—</span>}</td>
                  <td>{club.featured ? '⭐' : '—'}</td>
                  <td>
                    <button className="small" onClick={() => openEdit(club)}>
                      ✏️ Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
