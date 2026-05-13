import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type TenantProfile = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  galleryImages: string[];
  services: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  priceRange: string | null;
  visibilityMode: string;
  vertical: string;
};

export function ClubProfileEditPage() {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [services, setServices] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TenantProfile>('/admin/tenant/profile');
      setProfile(data);
      setDescription(data.description ?? '');
      setLocation(data.location ?? '');
      setServices((data.services ?? []).join(', '));
      setLogoUrl(data.logoUrl ?? '');
      setCoverImageUrl(data.coverImageUrl ?? '');
      setGalleryImages(data.galleryImages ?? []);
      setPriceRange(data.priceRange ?? '');
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiJson('/admin/tenant/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          description: description.trim() || null,
          location: location.trim() || null,
          services: services.split(',').map((s) => s.trim()).filter(Boolean),
          logoUrl: logoUrl.trim() || null,
          coverImageUrl: coverImageUrl.trim() || null,
          galleryImages,
          priceRange: priceRange.trim() || null,
        }),
      });
      alert('✅ Profil güncellendi');
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Kaydedilemedi'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (file: File, target: 'logo' | 'cover' | 'gallery') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiJson<{ url: string }>('/auth/upload-image', {
        method: 'POST',
        body: formData,
        headers: undefined, // Let browser set content-type with boundary
      });
      const fullUrl = `https://www.wellnessclub.tech${res.url}`;
      if (target === 'logo') setLogoUrl(fullUrl);
      else if (target === 'cover') setCoverImageUrl(fullUrl);
      else setGalleryImages((prev) => [...prev, fullUrl]);
    } catch (e) {
      alert(`Yükleme hatası: ${e instanceof Error ? e.message : 'Başarısız'}`);
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) return <div className="page-container"><p className="muted">Yükleniyor...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🏢 Kulüp Profili Düzenle</h1>
          <p className="muted">{profile?.name} — Tanıtım sayfanızı yönetin</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#38bdf8', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Sol kolon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Hakkımızda */}
          <div className="form-card">
            <label className="form-label">📝 Hakkımızda</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.9rem', resize: 'vertical' }}
              placeholder="Kulübünüzü tanıtan bir metin yazın..."
            />
          </div>

          {/* Konum */}
          <div className="form-card">
            <label className="form-label">📍 Konum / Adres</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: Huzur Mah. Azerbaycan Cad. No:4/A, İstanbul"
            />
          </div>

          {/* Hizmetler */}
          <div className="form-card">
            <label className="form-label">🎯 Hizmetler (virgülle ayırın)</label>
            <input
              value={services}
              onChange={(e) => setServices(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: Personal Training, Yoga, Pilates, Spa"
            />
          </div>

          {/* Fiyat Aralığı */}
          <div className="form-card">
            <label className="form-label">💰 Fiyat Aralığı</label>
            <input
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: ₺3.000 - ₺12.000 / ay"
            />
          </div>
        </div>

        {/* Sağ kolon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Logo */}
          <div className="form-card">
            <label className="form-label">🖼️ Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {logoUrl && <img src={logoUrl} alt="Logo" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', background: 'rgba(0,0,0,0.3)' }} />}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, 'logo'); }}
                style={{ fontSize: '0.85rem', color: '#94a3b8' }}
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="form-card">
            <label className="form-label">🌄 Kapak Görseli</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {coverImageUrl && <img src={coverImageUrl} alt="Cover" style={{ width: 120, height: 60, borderRadius: 8, objectFit: 'cover', background: 'rgba(0,0,0,0.3)' }} />}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, 'cover'); }}
                style={{ fontSize: '0.85rem', color: '#94a3b8' }}
              />
            </div>
          </div>

          {/* Galeri */}
          <div className="form-card">
            <label className="form-label">📸 Galeri Fotoğrafları (Slider)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {galleryImages.map((img, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={img} alt={`Gallery ${i}`} style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                  <button
                    onClick={() => removeGalleryImage(i)}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, 'gallery'); }}
              style={{ fontSize: '0.85rem', color: '#94a3b8' }}
              disabled={uploading}
            />
            {uploading && <p style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.5rem' }}>⏳ Yükleniyor...</p>}
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              Birden fazla fotoğraf ekleyebilirsiniz. Mobil uygulamada slider olarak görünür.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
