import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiJson, ApiError } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';

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
  targetCity: string | null;
  targetDistrict: string | null;
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
    targetCity: '',
    targetDistrict: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'expired' | 'draft'>('all');

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
      targetCity: '',
      targetDistrict: '',
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
      targetCity: (c as Campaign & { targetCity?: string }).targetCity ?? '',
      targetDistrict: (c as Campaign & { targetDistrict?: string }).targetDistrict ?? '',
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
        targetCity: form.targetCity || undefined,
        targetDistrict: form.targetDistrict || undefined,
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
            <label>
              Hedef İl (opsiyonel)
              <select value={form.targetCity} onChange={(e) => setForm({ ...form, targetCity: e.target.value, targetDistrict: '' })}>
                <option value="">Tüm İller</option>
                {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Hedef İlçe (opsiyonel)
              <select value={form.targetDistrict} onChange={(e) => setForm({ ...form, targetDistrict: e.target.value })} disabled={!form.targetCity}>
                <option value="">Tüm İlçeler</option>
                {form.targetCity && getDistricts(form.targetCity).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
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
        <>
          {/* İstatistik Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div className="stat-mini"><span className="stat-mini-val">{campaigns.length}</span><span className="stat-mini-lbl">Toplam</span></div>
            <div className="stat-mini"><span className="stat-mini-val">{campaigns.filter(c => c.status === 'active').length}</span><span className="stat-mini-lbl">Aktif</span></div>
            <div className="stat-mini"><span className="stat-mini-val">{campaigns.reduce((s, c) => s + c.viewCount, 0).toLocaleString('tr-TR')}</span><span className="stat-mini-lbl">Görüntülenme</span></div>
            <div className="stat-mini"><span className="stat-mini-val">{campaigns.reduce((s, c) => s + c.clickCount, 0).toLocaleString('tr-TR')}</span><span className="stat-mini-lbl">Tıklanma</span></div>
            <div className="stat-mini"><span className="stat-mini-val">{campaigns.reduce((s, c) => s + c.redemptionCount, 0)}</span><span className="stat-mini-lbl">Kullanım</span></div>
          </div>

          {/* Filtreler */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['all', 'active', 'paused', 'expired', 'draft'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline'}`}>
                {f === 'all' ? 'Tümü' : f === 'active' ? '🟢 Aktif' : f === 'paused' ? '⏸ Duraklatıldı' : f === 'expired' ? '⌛ Süresi Dolmuş' : '📝 Taslak'}
              </button>
            ))}
          </div>

          {/* Kampanya Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {campaigns
              .filter(c => statusFilter === 'all' || c.status === statusFilter)
              .map((c) => {
                const isExpired = new Date(c.endsAt) < new Date();
                const discountText = c.discountKind === 'percentage' ? `%${c.discountValue}` : `₺${c.discountValue}`;
                return (
                  <div key={c.id} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, overflow: 'hidden', opacity: isExpired ? 0.7 : 1 }}>
                    {c.imageUrl && <img src={c.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover' }} />}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{c.title}</h3>
                        <span className={`status-badge ${c.status === 'active' ? 'badge-green' : c.status === 'paused' ? 'badge-yellow' : 'badge-gray'}`}>
                          {c.status === 'active' ? 'Aktif' : c.status === 'paused' ? 'Durduruldu' : c.status === 'expired' ? 'Dolmuş' : 'Taslak'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem', color: 'var(--muted, #64748b)', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span>🏷️ {discountText}</span>
                        <span>📅 {new Date(c.endsAt).toLocaleDateString('tr-TR')}</span>
                        <span>👁️ {c.viewCount}</span>
                        <span>👆 {c.clickCount}</span>
                        {c.targetCity && <span>📍 {c.targetCity}{c.targetDistrict ? ` / ${c.targetDistrict}` : ''}</span>}
                      </div>
                      {c.description && <p style={{ fontSize: '0.82rem', color: 'var(--text, #374151)', margin: '0 0 10px' }}>{c.description.slice(0, 80)}{c.description.length > 80 ? '...' : ''}</p>}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-sm btn-outline" onClick={() => void handleToggleStatus(c)}>{c.status === 'active' ? '⏸' : '▶'}</button>
                        <button className="btn-sm btn-outline" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn-sm btn-outline" onClick={async () => { try { const res = await apiJson<{ sent: number }>(`/campaigns/admin/${c.id}/notify`, { method: 'POST' }); alert(`🔔 ${res.sent} üyeye bildirim gönderildi`); } catch (e) { alert(e instanceof ApiError ? e.message : 'Hata'); } }}>🔔</button>
                        <button className="btn-sm btn-outline" onClick={() => { navigator.clipboard.writeText(`https://www.wellnessclub.tech/discover?campaign=${c.id}`); alert('📋 Link kopyalandı!'); }}>🔗</button>
                        <button className="btn-sm btn-danger" onClick={() => void handleDelete(c.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
