import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { CITY_LIST, getDistricts } from '@rezidans-fitness/shared';
import { readStoredTenantSubdomain } from '../auth/storage';

type TenantProfile = {
  id: string;
  name: string;
  subdomain: string;
  description: string | null;
  location: string | null;
  city: string | null;
  district: string | null;
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
  const [clubCode, setClubCode] = useState('');

  // Form state
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [services, setServices] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TenantProfile>('/admin/tenant/profile');
      setProfile(data);
      setDescription(data.description ?? '');
      setLocation(data.location ?? '');
      setCity(data.city ?? '');
      setDistrict(data.district ?? '');
      setServices((data.services ?? []).join(', '));
      setLogoUrl(data.logoUrl ?? '');
      setCoverImageUrl(data.coverImageUrl ?? '');
      setGalleryImages(data.galleryImages ?? []);
      setPriceRange(data.priceRange ?? '');
      setPhone(data.phone ?? '');
      setEmail(data.email ?? '');
      setWebsite(data.website ?? '');
    } catch { /* */ }
    finally { setLoading(false); }
    // Club code
    try {
      const res = await apiJson<{ inviteCode: string }>('/admin/club-invite-code');
      setClubCode(res.inviteCode);
    } catch { /* */ }
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
          city: city.trim() || null,
          district: district.trim() || null,
          services: services.split(',').map(s => s.trim()).filter(Boolean),
          logoUrl: logoUrl.trim() || null,
          coverImageUrl: coverImageUrl.trim() || null,
          galleryImages,
          priceRange: priceRange.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
        }),
      });
      alert('✅ Profil güncellendi');
    } catch (e) { alert(`Hata: ${e instanceof Error ? e.message : 'Kaydedilemedi'}`); }
    finally { setSaving(false); }
  };

  const handleUploadImage = async (file: File, target: 'logo' | 'cover' | 'gallery') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { readStoredToken } = await import('../auth/storage');
      const token = readStoredToken();
      const { apiBaseUrl } = await import('../lib/config');
      const base = apiBaseUrl();
      const res = await fetch(`${base}/auth/upload-image`, { method: 'POST', body: formData, headers: token ? { 'Authorization': `Bearer ${token}` } : undefined });
      if (!res.ok) throw new Error('Upload failed');
      const body = await res.json() as { url?: string };
      if (body.url) {
        const fullUrl = body.url.startsWith('http') ? body.url : `https://www.wellnessclub.tech${body.url}`;
        if (target === 'logo') setLogoUrl(fullUrl);
        else if (target === 'cover') setCoverImageUrl(fullUrl);
        else setGalleryImages(prev => [...prev, fullUrl]);
      }
    } catch { alert('Yükleme hatası'); }
    finally { setUploading(false); }
  };

  const removeGalleryImage = (index: number) => setGalleryImages(prev => prev.filter((_, i) => i !== index));

  // Profile completeness score
  const scoreItems = [
    !!description, !!location, !!city, !!logoUrl, !!coverImageUrl,
    galleryImages.length > 0, !!phone, !!email, services.length > 0, !!priceRange,
  ];
  const completeness = Math.round((scoreItems.filter(Boolean).length / scoreItems.length) * 100);

  if (loading) return <div style={{ padding: '2rem' }}><p style={{ color: '#64748b' }}>Yükleniyor...</p></div>;

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>🏢 Kulüp Profili</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>{profile?.name} — Tanıtım sayfanızı yönetin</p>
        </div>
        <button onClick={() => void handleSave()} disabled={saving} style={{ padding: '12px 24px', borderRadius: 10, background: saving ? '#e2e8f0' : '#2563eb', color: saving ? '#94a3b8' : '#fff', fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
          {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>

      {/* Club Code + Completeness */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Kulüp Kodu</p>
          <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace', letterSpacing: 1 }}>{clubCode || '...'}</p>
        </div>
        <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Subdomain</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{readStoredTenantSubdomain() || profile?.subdomain}</p>
        </div>
        <div style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Profil Doluluk</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${completeness}%`, height: '100%', background: completeness >= 80 ? '#059669' : completeness >= 50 ? '#d97706' : '#dc2626', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: completeness >= 80 ? '#059669' : completeness >= 50 ? '#d97706' : '#dc2626' }}>%{completeness}</span>
          </div>
        </div>
      </div>

      {/* Form Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Sol Kolon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hakkımızda */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>📝 Hakkımızda</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, resize: 'vertical' }} placeholder="Kulübünüzü tanıtan bir metin yazın..." />
          </div>

          {/* Konum */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>📍 Adres</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} placeholder="Tam adres..." />
          </div>

          {/* İl / İlçe */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🗺️ İl / İlçe</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(''); }} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }}>
                <option value="">İl seçin...</option>
                {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!city} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, opacity: city ? 1 : 0.5 }}>
                <option value="">İlçe seçin...</option>
                {city && getDistricts(city).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* İletişim */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>📞 İletişim Bilgileri</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} placeholder="Telefon: 0212 XXX XX XX" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} placeholder="E-posta: info@kulup.com" />
              <input value={website} onChange={(e) => setWebsite(e.target.value)} type="url" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} placeholder="Web sitesi: https://..." />
            </div>
          </div>

          {/* Hizmetler + Fiyat */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🎯 Hizmetler & Fiyat</label>
            <input value={services} onChange={(e) => setServices(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, marginBottom: 8 }} placeholder="Personal Training, Yoga, Pilates, Spa..." />
            <input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} placeholder="Fiyat aralığı: ₺3.000 - ₺12.000 / ay" />
          </div>
        </div>

        {/* Sağ Kolon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Logo */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🖼️ Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', border: '1px solid #e2e8f0' }} /> : <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>📷</div>}
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadImage(f, 'logo'); }} style={{ fontSize: 13 }} />
            </div>
          </div>

          {/* Kapak */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🌄 Kapak Görseli</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {coverImageUrl ? <img src={coverImageUrl} alt="Cover" style={{ width: 140, height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid #e2e8f0' }} /> : <div style={{ width: 140, height: 60, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12 }}>Kapak yok</div>}
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadImage(f, 'cover'); }} style={{ fontSize: 13 }} />
            </div>
          </div>

          {/* Galeri */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>📸 Galeri ({galleryImages.length} fotoğraf)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {galleryImages.map((img, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={img} alt="" style={{ width: 72, height: 54, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                  <button onClick={() => removeGalleryImage(i)} style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, background: '#dc2626', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadImage(f, 'gallery'); }} style={{ fontSize: 13 }} disabled={uploading} />
            {uploading && <p style={{ fontSize: 12, color: '#2563eb', marginTop: 4 }}>⏳ Yükleniyor...</p>}
          </div>

          {/* Önizleme Link */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🌐 Public Sayfa Önizleme</label>
            <a href={`https://www.wellnessclub.tech/club/${profile?.subdomain || readStoredTenantSubdomain()}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              wellnessclub.tech/club/{profile?.subdomain || readStoredTenantSubdomain()} ↗
            </a>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Üyelerin ve ziyaretçilerin gördüğü profil sayfanız</p>
          </div>
        </div>
      </div>
    </div>
  );
}
