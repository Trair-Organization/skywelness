import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

type PendingEvent = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  price: string;
  location: string | null;
  coachName: string | null;
  imageUrl: string | null;
  tenantName: string;
  createdAt: string;
};

export function SuperAdminEventsPage() {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await apiJson<PendingEvent[]>('/platform-admin/events/pending'));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(id: string) {
    setActingId(id);
    try {
      await apiJson(`/platform-admin/events/${id}/approve`, { method: 'POST' });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Onay başarısız'); }
    setActingId(null);
  }

  async function reject(id: string) {
    const reason = prompt('Red sebebi (opsiyonel):') ?? undefined;
    setActingId(id);
    try {
      await apiJson(`/platform-admin/events/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (e) { alert(e instanceof ApiError ? e.message : 'Red başarısız'); }
    setActingId(null);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Etkinlik Onay Merkezi</h1>
          <p className="dashboard-subtitle">{events.length} etkinlik onay bekliyor</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : events.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">✅</span><p>Onay bekleyen etkinlik yok</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {events.map((ev) => (
            <div key={ev.id} style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: 12, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {ev.imageUrl && <img src={ev.imageUrl} alt="" style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{ev.title}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--muted, #64748b)' }}>
                      🏢 {ev.tenantName} • 📅 {new Date(ev.startsAt).toLocaleDateString('tr-TR')} {new Date(ev.startsAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      {ev.coachName && ` • 🏋️ ${ev.coachName}`}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>Onay Bekliyor</span>
                </div>
                {ev.description && <p style={{ fontSize: '0.85rem', color: 'var(--text, #374151)', margin: '4px 0 8px' }}>{ev.description.slice(0, 150)}{ev.description.length > 150 ? '...' : ''}</p>}
                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--muted, #64748b)', marginBottom: 10 }}>
                  {ev.location && <span>📍 {ev.location}</span>}
                  <span>👥 {ev.capacity} kişi</span>
                  <span>💰 {parseFloat(ev.price) > 0 ? `₺${parseFloat(ev.price).toLocaleString('tr-TR')}` : 'Ücretsiz'}</span>
                  <span>📂 {ev.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-sm btn-primary"
                    disabled={actingId === ev.id}
                    onClick={() => void approve(ev.id)}
                    style={{ background: '#059669' }}
                  >
                    ✅ Onayla
                  </button>
                  <button
                    className="btn-sm btn-danger"
                    disabled={actingId === ev.id}
                    onClick={() => void reject(ev.id)}
                  >
                    ❌ Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
