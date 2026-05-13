import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type ServiceRow = { id: string; name: string; description: string | null; durationMinutes: number; price: string; capacity: number; active: boolean };
type PackageRow = { id: string; name: string; sessionCount: number; price: string; validityDays: number; sessionType: string; active: boolean };

export function TrainerServicesPage() {
  const [tab, setTab] = useState<'services' | 'packages'>('services');
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Service form
  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sDuration, setSDuration] = useState('60');
  const [sPrice, setSPrice] = useState('');
  const [sCapacity, setSCapacity] = useState('1');
  const [sCreating, setSCreating] = useState(false);

  // Package form
  const [pName, setPName] = useState('');
  const [pSessions, setPSessions] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDays, setPDays] = useState('30');
  const [pType, setPType] = useState('personal_training');
  const [pCreating, setPCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        apiJson<ServiceRow[]>('/trainer-panel/services'),
        apiJson<PackageRow[]>('/trainer-panel/packages'),
      ]);
      setServices(s);
      setPackages(p);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreateService = async () => {
    if (!sName.trim() || !sPrice) return;
    setSCreating(true);
    try {
      await apiJson('/trainer-panel/services', {
        method: 'POST',
        body: JSON.stringify({
          name: sName.trim(),
          description: sDesc.trim() || undefined,
          durationMinutes: parseInt(sDuration) || 60,
          price: parseFloat(sPrice),
          capacity: parseInt(sCapacity) || 1,
        }),
      });
      setSName(''); setSDesc(''); setSPrice('');
      await load();
    } catch (e) { alert(`Hata: ${e instanceof Error ? e.message : 'Oluşturulamadı'}`); }
    finally { setSCreating(false); }
  };

  const handleCreatePackage = async () => {
    if (!pName.trim() || !pSessions || !pPrice) return;
    setPCreating(true);
    try {
      await apiJson('/trainer-panel/packages', {
        method: 'POST',
        body: JSON.stringify({
          name: pName.trim(),
          sessionCount: parseInt(pSessions),
          price: parseFloat(pPrice),
          validityDays: parseInt(pDays) || 30,
          sessionType: pType,
        }),
      });
      setPName(''); setPSessions(''); setPPrice('');
      await load();
    } catch (e) { alert(`Hata: ${e instanceof Error ? e.message : 'Oluşturulamadı'}`); }
    finally { setPCreating(false); }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/services/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(`Hata: ${e instanceof Error ? e.message : 'Silinemedi'}`); }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/trainer-panel/packages/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) { alert(`Hata: ${e instanceof Error ? e.message : 'Silinemedi'}`); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>📦 Hizmetlerim & Paketlerim</h1>
          <p className="muted">Verdiğiniz hizmetleri ve paket fiyatlarınızı yönetin</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['services', 'packages'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: tab === t ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(148,163,184,0.15)', background: tab === t ? 'rgba(56,189,248,0.08)' : 'transparent', color: tab === t ? '#38bdf8' : '#94a3b8', fontWeight: 700, cursor: 'pointer' }}>
            {t === 'services' ? '🏋️ Hizmetlerim' : '💎 Paketlerim'}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Yükleniyor...</p>}

      {/* Hizmetler */}
      {!loading && tab === 'services' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Liste */}
          <div>
            <h3 style={{ color: '#e2e8f0', marginBottom: '0.75rem' }}>Mevcut Hizmetler</h3>
            {services.length === 0 ? <p className="muted">Henüz hizmet eklenmemiş</p> : services.map((s) => (
              <div key={s.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.1)', background: 'rgba(0,0,0,0.15)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>{s.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{s.durationMinutes} dk · {s.capacity} kişi</div>
                  {s.description && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{s.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>{s.price}₺</span>
                  <button onClick={() => handleDeleteService(s.id)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Sil</button>
                </div>
              </div>
            ))}
          </div>
          {/* Form */}
          <div style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.1)', background: 'rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>+ Yeni Hizmet Ekle</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Hizmet Adı (örn: 60dk Personal Training)" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
              <input value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="Açıklama (opsiyonel)" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={sDuration} onChange={(e) => setSDuration(e.target.value)} placeholder="Süre (dk)" type="number" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
                <input value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="Fiyat (₺)" type="number" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
                <input value={sCapacity} onChange={(e) => setSCapacity(e.target.value)} placeholder="Kişi" type="number" style={{ flex: 0.5, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
              </div>
              <button onClick={handleCreateService} disabled={sCreating || !sName.trim() || !sPrice} style={{ padding: '0.75rem', borderRadius: '10px', background: '#38bdf8', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: sCreating ? 0.5 : 1 }}>
                {sCreating ? '⏳ Ekleniyor...' : '✓ Hizmet Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paketler */}
      {!loading && tab === 'packages' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Liste */}
          <div>
            <h3 style={{ color: '#e2e8f0', marginBottom: '0.75rem' }}>Mevcut Paketler</h3>
            {packages.length === 0 ? <p className="muted">Henüz paket eklenmemiş</p> : packages.map((p) => (
              <div key={p.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.1)', background: 'rgba(0,0,0,0.15)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>{p.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>{p.sessionCount} seans · {p.validityDays} gün geçerli</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{p.sessionType === 'personal_training' ? '🏋️ PT' : '💆 Masaj'} · {Math.round(parseFloat(p.price) / p.sessionCount)}₺/seans</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1.1rem' }}>{p.price}₺</span>
                  <button onClick={() => handleDeletePackage(p.id)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '6px', padding: '0.3rem 0.6rem', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Sil</button>
                </div>
              </div>
            ))}
          </div>
          {/* Form */}
          <div style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid rgba(148,163,184,0.1)', background: 'rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>+ Yeni Paket Ekle</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Paket Adı (örn: 10 Seans PT Paketi)" style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={pSessions} onChange={(e) => setPSessions(e.target.value)} placeholder="Seans Sayısı" type="number" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
                <input value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="Toplam Fiyat (₺)" type="number" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input value={pDays} onChange={(e) => setPDays(e.target.value)} placeholder="Geçerlilik (gün)" type="number" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
                <select value={pType} onChange={(e) => setPType(e.target.value)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}>
                  <option value="personal_training">🏋️ Personal Training</option>
                  <option value="massage">💆 Masaj</option>
                </select>
              </div>
              <button onClick={handleCreatePackage} disabled={pCreating || !pName.trim() || !pSessions || !pPrice} style={{ padding: '0.75rem', borderRadius: '10px', background: '#34d399', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', opacity: pCreating ? 0.5 : 1 }}>
                {pCreating ? '⏳ Ekleniyor...' : '✓ Paket Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
