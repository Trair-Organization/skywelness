import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiJson, ApiError } from '../lib/api';

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  campaignType: string;
  status: string;
  discountKind: string;
  discountValue: string;
  originalPrice: string | null;
  discountedPrice: string | null;
  terms: string | null;
  imageUrl: string | null;
  audience: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  viewCount: number;
  clickCount: number;
  createdAt: string;
};

const CAMPAIGN_TYPES = [
  { value: 'massage_package', label: 'Masaj Paketi' },
  { value: 'membership', label: 'Kulüp Üyelik' },
  { value: 'personal_training', label: 'Özel Ders' },
  { value: 'general', label: 'Genel' },
];

const AUDIENCES = [
  { value: 'everyone', label: 'Herkes' },
  { value: 'new_members', label: 'Yeni Üyeler' },
  { value: 'existing_members', label: 'Mevcut Üyeler' },
];

export function CampaignsPage() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    campaignType: 'general',
    discountKind: 'percentage',
    discountValue: '',
    originalPrice: '',
    discountedPrice: '',
    terms: '',
    audience: 'everyone',
    startsAt: '',
    endsAt: '',
    maxRedemptions: '',
    imageUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiJson<Campaign[]>('/campaigns/admin');
      setCampaigns(rows);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      queueMicrotask(() => {
        void loadCampaigns();
      });
    }
  }, [token, loadCampaigns]);

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      campaignType: 'general',
      discountKind: 'percentage',
      discountValue: '',
      originalPrice: '',
      discountedPrice: '',
      terms: '',
      audience: 'everyone',
      startsAt: '',
      endsAt: '',
      maxRedemptions: '',
      imageUrl: '',
    });
    setEditId(null);
  };

  const openEdit = (c: Campaign) => {
    setForm({
      title: c.title,
      description: c.description ?? '',
      campaignType: c.campaignType,
      discountKind: c.discountKind,
      discountValue: c.discountValue,
      originalPrice: c.originalPrice ?? '',
      discountedPrice: c.discountedPrice ?? '',
      terms: c.terms ?? '',
      audience: c.audience,
      startsAt: c.startsAt.slice(0, 16),
      endsAt: c.endsAt.slice(0, 16),
      maxRedemptions: c.maxRedemptions?.toString() ?? '',
      imageUrl: c.imageUrl ?? '',
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100/api/v1') +
          '/auth/upload-image',
        { method: 'POST', body: formData },
      );
      if (!res.ok) throw new Error('Upload failed');
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        const baseUrl = (
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100/api/v1'
        ).replace('/api/v1', '');
        const fullUrl = body.url.startsWith('http') ? body.url : `${baseUrl}${body.url}`;
        setForm((prev) => ({ ...prev, imageUrl: fullUrl }));
      }
    } catch {
      alert('Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        campaignType: form.campaignType,
        discountKind: form.discountKind,
        discountValue: Number(form.discountValue),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        discountedPrice: form.discountedPrice ? Number(form.discountedPrice) : undefined,
        terms: form.terms || undefined,
        audience: form.audience,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        imageUrl: form.imageUrl || undefined,
      };
      if (editId) {
        await apiJson(`/campaigns/admin/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson('/campaigns/admin', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      resetForm();
      await loadCampaigns();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinize emin misiniz?')) return;
    await apiJson(`/campaigns/admin/${id}`, { method: 'DELETE' });
    await loadCampaigns();
  };

  const handleToggleStatus = async (c: Campaign) => {
    const newStatus = c.status === 'active' ? 'paused' : 'active';
    await apiJson(`/campaigns/admin/${c.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    await loadCampaigns();
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🔥 Kampanyalar</h1>
          <p className="dashboard-subtitle">Üyelerinize özel teklifler oluşturun</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Yeni Kampanya
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3>{editId ? 'Kampanya Düzenle' : 'Yeni Kampanya Oluştur'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Başlık *
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
              />
            </label>
            <label>
              Açıklama
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </label>
            <label>
              Kampanya Tipi *
              <select
                value={form.campaignType}
                onChange={(e) => setForm({ ...form, campaignType: e.target.value })}
              >
                {CAMPAIGN_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              İndirim Tipi *
              <select
                value={form.discountKind}
                onChange={(e) => setForm({ ...form, discountKind: e.target.value })}
              >
                <option value="percentage">Yüzde (%)</option>
                <option value="fixed">Sabit (₺)</option>
              </select>
            </label>
            <label>
              İndirim Değeri *
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                required
                min={0}
                step="0.01"
              />
            </label>
            <label>
              Güncel Fiyat (₺)
              <input
                type="number"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                min={0}
                step="0.01"
                placeholder="Örn: 5000"
              />
            </label>
            <label>
              İndirimli Fiyat (₺)
              <input
                type="number"
                value={form.discountedPrice}
                onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                min={0}
                step="0.01"
                placeholder="Örn: 3500"
              />
            </label>
            <label>
              Kampanya Koşulları
              <textarea
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                rows={2}
                placeholder="Örn: Minimum 8 seans alımında geçerlidir"
              />
            </label>
            <label>
              Kampanya Görseli
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploading}
                />
                {uploading && <span className="muted">Yükleniyor...</span>}
              </div>
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Kampanya görseli"
                  style={{ marginTop: 8, maxHeight: 80, borderRadius: 8 }}
                />
              )}
            </label>
            <label>
              Hedef Kitle
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Başlangıç *
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                required
              />
            </label>
            <label>
              Bitiş *
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                required
              />
            </label>
            <label>
              Maks. Kullanım (opsiyonel)
              <input
                type="number"
                value={form.maxRedemptions}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
                min={1}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Oluştur'}
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : campaigns.length === 0 ? (
        <div className="card empty-state">
          <p>Henüz kampanya oluşturmadınız.</p>
          <p className="muted">Üyelerinize özel teklifler sunarak dönüşüm oranınızı artırın.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Başlık</th>
                <th>Tip</th>
                <th>İndirim</th>
                <th>Durum</th>
                <th>Bitiş</th>
                <th>Görüntülenme</th>
                <th>Tıklanma</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                  </td>
                  <td>
                    {CAMPAIGN_TYPES.find((ct) => ct.value === c.campaignType)?.label ??
                      c.campaignType}
                  </td>
                  <td>
                    {c.discountKind === 'percentage'
                      ? `%${c.discountValue}`
                      : `₺${c.discountValue}`}
                  </td>
                  <td>
                    <span
                      className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'paused' ? 'badge-yellow' : 'badge-gray'}`}
                    >
                      {c.status === 'active'
                        ? 'Aktif'
                        : c.status === 'paused'
                          ? 'Duraklatıldı'
                          : c.status}
                    </span>
                  </td>
                  <td>{new Date(c.endsAt).toLocaleDateString('tr-TR')}</td>
                  <td>{c.viewCount}</td>
                  <td>{c.clickCount}</td>
                  <td>
                    <button className="small" onClick={() => handleToggleStatus(c)}>
                      {c.status === 'active' ? '⏸' : '▶'}
                    </button>
                    <button className="small" onClick={() => openEdit(c)}>
                      ✏️
                    </button>
                    <button className="small danger" onClick={() => handleDelete(c.id)}>
                      🗑
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
