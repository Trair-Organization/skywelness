import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';
import { readStoredTenantSubdomain } from '../auth/storage';

type Service = {
  id: string;
  name: string;
  category: string;
  providerName: string | null;
  durationMinutes: number;
  price: string;
};

type SlotSummary = {
  date: string;
  total: number;
  available: number;
  booked: number;
};

export function ScheduleSlotsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [slotSummary, setSlotSummary] = useState<SlotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    startHour: 7,
    endHour: 24,
    price: '',
  });
  const [genResult, setGenResult] = useState<{ created: number } | null>(null);
  const subdomain = readStoredTenantSubdomain() || '';

  const loadServices = useCallback(async () => {
    if (!subdomain) return;
    try {
      const data = await apiJson<Service[]>(`/v2/services?tenant=${encodeURIComponent(subdomain)}`);
      setServices(data);
      if (data.length > 0 && !selectedService) setSelectedService(data[0].id);
    } catch { /* */ }
  }, [subdomain, selectedService]);

  const loadSlotSummary = useCallback(async () => {
    if (!selectedService || !subdomain) return;
    setLoading(true);
    try {
      // Son 30 günün slot özetini al
      const today = new Date();
      const summaries: SlotSummary[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const date = d.toISOString().slice(0, 10);
        try {
          const slots = await apiJson<Array<{ id: string; status: string }>>(`/v2/schedule?tenant=${encodeURIComponent(subdomain)}&serviceId=${selectedService}&date=${date}`, { auth: false });
          summaries.push({
            date,
            total: slots.length,
            available: slots.filter(s => s.status === 'available').length,
            booked: slots.filter(s => s.status === 'booked').length,
          });
        } catch {
          summaries.push({ date, total: 0, available: 0, booked: 0 });
        }
      }
      setSlotSummary(summaries);
    } finally { setLoading(false); }
  }, [selectedService, subdomain]);

  useEffect(() => { void loadServices(); }, [loadServices]);
  useEffect(() => { if (selectedService) void loadSlotSummary(); }, [selectedService, loadSlotSummary]);

  async function handleGenerate() {
    if (!selectedService) return;
    const svc = services.find(s => s.id === selectedService);
    if (!svc) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await apiJson<{ created: number; serviceId: string }>('/v2/schedule/generate', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: selectedService,
          providerType: svc.category === 'court_rental' ? 'resource' : 'trainer',
          startDate: genForm.startDate,
          endDate: genForm.endDate,
          startHour: genForm.startHour,
          endHour: genForm.endHour,
          price: genForm.price ? parseFloat(genForm.price) : undefined,
        }),
      });
      setGenResult(result);
      void loadSlotSummary();
    } catch (err) { alert(err instanceof Error ? err.message : 'Slot oluşturulamadı'); }
    finally { setGenerating(false); }
  }

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      personal_training: '🏋️ PT',
      massage: '💆 Masaj',
      court_rental: '🎾 Kort',
      group_class: '👥 Grup Ders',
    };
    return map[cat] || cat;
  };

  return (
    <AdminLayout>
      <div style={{ padding: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>🗓️ Slot Yönetimi</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>Hizmet bazlı müsaitlik slotlarını yönetin.</p>

        {/* Hizmet Seçimi */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Hizmet Seç</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            style={{ padding: '0.65rem 0.9rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.9rem', minWidth: 320 }}
          >
            {services.map(s => (
              <option key={s.id} value={s.id}>
                {categoryLabel(s.category)} {s.name} — {s.price}₺/{s.durationMinutes}dk
              </option>
            ))}
          </select>
        </div>

        {/* Slot Özeti — 14 Günlük */}
        {selectedService && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>📊 14 Günlük Slot Durumu</h2>
            {loading ? (
              <p className="muted">Yükleniyor...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                {slotSummary.map(s => {
                  const d = new Date(s.date);
                  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                  const isToday = s.date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={s.date} style={{
                      padding: '0.75rem',
                      borderRadius: 10,
                      border: `1px solid ${isToday ? 'rgba(56,189,248,0.4)' : 'rgba(148,163,184,0.12)'}`,
                      background: isToday ? 'rgba(56,189,248,0.05)' : 'rgba(0,0,0,0.2)',
                      textAlign: 'center',
                    }}>
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>{dayNames[d.getDay()]}</div>
                      <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>{d.getDate()}/{d.getMonth() + 1}</div>
                      <div style={{ marginTop: '0.4rem', display: 'flex', justifyContent: 'center', gap: '0.3rem' }}>
                        <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>{s.available}✓</span>
                        <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 700 }}>{s.booked}✗</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Slot Oluşturma Formu */}
        <div style={{ padding: '1.5rem', borderRadius: 12, border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>➕ Toplu Slot Oluştur</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Başlangıç Tarihi</span>
              <input type="date" value={genForm.startDate} onChange={(e) => setGenForm(p => ({ ...p, startDate: e.target.value }))}
                style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Bitiş Tarihi</span>
              <input type="date" value={genForm.endDate} onChange={(e) => setGenForm(p => ({ ...p, endDate: e.target.value }))}
                style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Başlangıç Saati</span>
              <select value={genForm.startHour} onChange={(e) => setGenForm(p => ({ ...p, startHour: Number(e.target.value) }))}
                style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}>
                {Array.from({ length: 18 }, (_, i) => i + 6).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Bitiş Saati</span>
              <select value={genForm.endHour} onChange={(e) => setGenForm(p => ({ ...p, endHour: Number(e.target.value) }))}
                style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}>
                {Array.from({ length: 18 }, (_, i) => i + 7).map(h => (
                  <option key={h} value={h}>{String(h === 24 ? 0 : h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>Fiyat Override (opsiyonel)</span>
              <input type="number" value={genForm.price} onChange={(e) => setGenForm(p => ({ ...p, price: e.target.value }))}
                placeholder="Boş = hizmet fiyatı"
                style={{ padding: '0.6rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }} />
            </label>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedService}
            style={{ padding: '0.75rem 1.5rem', borderRadius: 10, border: 'none', background: '#38bdf8', color: '#0a0f1a', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
          >
            {generating ? 'Oluşturuluyor...' : '🗓️ Slotları Oluştur'}
          </button>
          {genResult && (
            <p style={{ color: '#10b981', fontWeight: 700, marginTop: '0.75rem' }}>
              ✅ {genResult.created} slot başarıyla oluşturuldu!
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
