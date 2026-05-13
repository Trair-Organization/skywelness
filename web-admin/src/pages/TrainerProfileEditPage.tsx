import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type TrainerProfileData = {
  id: string;
  bio: string | null;
  photoUrl: string | null;
  specializations: string[];
  certifications: string[];
  offersSessionTypes: string[];
  avgRating: string;
  totalSessions: number;
  pricingNote: string | null;
  city: string | null;
  experienceYears: number | null;
};

export function TrainerProfileEditPage() {
  const [profile, setProfile] = useState<TrainerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [certifications, setCertifications] = useState('');
  const [offersSessionTypes, setOffersSessionTypes] = useState('');
  const [pricingNote, setPricingNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<TrainerProfileData>('/trainer-panel/profile');
      setProfile(data);
      setBio(data.bio ?? '');
      setSpecializations((data.specializations ?? []).join(', '));
      setCertifications((data.certifications ?? []).join(', '));
      setOffersSessionTypes((data.offersSessionTypes ?? []).join(', '));
      setPricingNote(data.pricingNote ?? '');
      setPhotoUrl(data.photoUrl ?? '');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiJson('/trainer-panel/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          bio: bio.trim() || null,
          specializations: specializations.split(',').map((s) => s.trim()).filter(Boolean),
          certifications: certifications.split(',').map((s) => s.trim()).filter(Boolean),
          offersSessionTypes: offersSessionTypes.split(',').map((s) => s.trim()).filter(Boolean),
          pricingNote: pricingNote.trim() || null,
          photoUrl: photoUrl.trim() || null,
        }),
      });
      alert('✅ Profil güncellendi');
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Kaydedilemedi'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiJson<{ url: string }>('/auth/upload-image', {
        method: 'POST',
        body: formData,
        headers: undefined,
      });
      const fullUrl = `https://www.wellnessclub.tech${res.url}`;
      setPhotoUrl(fullUrl);
    } catch (e) {
      alert(`Yükleme hatası: ${e instanceof Error ? e.message : 'Başarısız'}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="page-container"><p className="muted">Yükleniyor...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🏋️ Profilimi Düzenle</h1>
          <p className="muted">Uzmanlık alanlarınızı, bio ve sertifikalarınızı güncelleyin</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#38bdf8', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}
        >
          {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>

      {/* Metrikler */}
      {profile && (
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8' }}>★ {profile.avgRating}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Puan</div>
          </div>
          <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34d399' }}>{profile.totalSessions}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Toplam Seans</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Sol */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-card">
            <label className="form-label">📝 Hakkımda (Bio)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.9rem', resize: 'vertical' }}
              placeholder="Kendinizi tanıtın, deneyimlerinizi ve yaklaşımınızı yazın..."
            />
          </div>

          <div className="form-card">
            <label className="form-label">🎯 Uzmanlık Alanları (virgülle ayırın)</label>
            <input
              value={specializations}
              onChange={(e) => setSpecializations(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: Kickboks, Boks, Fitness, Yoga"
            />
          </div>

          <div className="form-card">
            <label className="form-label">📜 Sertifikalar (virgülle ayırın)</label>
            <input
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: ACE CPT, Kickboks 3. Kademe Antrenör"
            />
          </div>
        </div>

        {/* Sağ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-card">
            <label className="form-label">🖼️ Profil Fotoğrafı</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {photoUrl && <img src={photoUrl} alt="Profil" style={{ width: 64, height: 64, borderRadius: 32, objectFit: 'cover', background: 'rgba(0,0,0,0.3)' }} />}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadPhoto(f); }}
                style={{ fontSize: '0.85rem', color: '#94a3b8' }}
                disabled={uploading}
              />
            </div>
            {uploading && <p style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.5rem' }}>⏳ Yükleniyor...</p>}
          </div>

          <div className="form-card">
            <label className="form-label">🏋️ Verdiğim Hizmetler (virgülle ayırın)</label>
            <input
              value={offersSessionTypes}
              onChange={(e) => setOffersSessionTypes(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: personal_training, massage"
            />
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Değerler: personal_training, massage
            </p>
          </div>

          <div className="form-card">
            <label className="form-label">💰 Fiyat Notu</label>
            <input
              value={pricingNote}
              onChange={(e) => setPricingNote(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              placeholder="Örn: Seans başı ve paket seçenekleri mevcuttur."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
