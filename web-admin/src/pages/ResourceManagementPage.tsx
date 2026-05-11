import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type ResourceRow = {
  id: string;
  name: string;
  resourceType: string;
  capacity: number;
  durationMinutes: number;
  price: string;
  active: boolean;
};
type AddonRow = {
  id: string;
  name: string;
  price: string;
  description: string | null;
  active: boolean;
};
type BookingRow = {
  id: string;
  resourceName: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: string;
  status: string;
  paymentStatus: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  createdAt: string;
};

export function ResourceManagementPage() {
  const [tab, setTab] = useState<'bookings' | 'resources' | 'slots' | 'addons'>('bookings');
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot creation form
  const [selectedResource, setSelectedResource] = useState('');
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotStartHour, setSlotStartHour] = useState(6);
  const [slotEndHour, setSlotEndHour] = useState(24);
  const [slotPrice, setSlotPrice] = useState('');
  const [creating, setCreating] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, add, book] = await Promise.all([
        apiJson<ResourceRow[]>('/resource-booking/admin/resources'),
        apiJson<AddonRow[]>('/resource-booking/admin/addons'),
        apiJson<BookingRow[]>('/resource-booking/admin/bookings'),
      ]);
      setResources(res);
      setAddons(add);
      setBookings(book);
      if (res.length > 0) setSelectedResource((prev) => prev || res[0].id);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const handleCreateSlots = async () => {
    if (!selectedResource || !slotDate) return;
    setCreating(true);
    try {
      const slots = [];
      for (let h = slotStartHour; h < slotEndHour; h++) {
        slots.push({
          startTime: `${h.toString().padStart(2, '0')}:00`,
          endTime: `${(h + 1).toString().padStart(2, '0')}:00`,
          price: slotPrice ? parseFloat(slotPrice) : undefined,
        });
      }
      await apiJson('/resource-booking/admin/slots', {
        method: 'POST',
        body: JSON.stringify({ resourceId: selectedResource, date: slotDate, slots }),
      });
      alert(`✅ ${slots.length} slot oluşturuldu`);
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Oluşturulamadı'}`);
    } finally {
      setCreating(false);
    }
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (!confirm('Bu rezervasyonu onaylamak istediğinize emin misiniz?')) return;
    setActionLoading(id);
    try {
      await apiJson(`/resource-booking/admin/bookings/${id}/approve`, { method: 'POST' });
      await load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'İşlem başarısız'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Red sebebi (opsiyonel):');
    if (reason === null) return; // cancelled
    setActionLoading(id);
    try {
      await apiJson(`/resource-booking/admin/bookings/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || undefined }),
      });
      await load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'İşlem başarısız'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminCancel = async (id: string) => {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) return;
    setActionLoading(id);
    try {
      await apiJson(`/resource-booking/admin/bookings/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin tarafından iptal edildi' }),
      });
      await load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'İşlem başarısız'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⏳ Bekliyor' },
      confirmed: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ Onaylı' },
      cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '❌ İptal' },
      completed: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: '✓ Tamamlandı' },
    };
    const c = colors[status] || colors.pending;
    return (
      <span
        style={{
          padding: '0.25rem 0.6rem',
          borderRadius: '6px',
          background: c.bg,
          color: c.color,
          fontWeight: 700,
          fontSize: '0.75rem',
        }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🏟️ Kaynak & Rezervasyon Yönetimi</h1>
          <p className="muted">Kortlar, slotlar, ek hizmetler ve rezervasyonları yönetin</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['bookings', 'slots', 'resources', 'addons'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border:
                tab === t ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(148,163,184,0.15)',
              background: tab === t ? 'rgba(56,189,248,0.08)' : 'transparent',
              color: tab === t ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t === 'bookings'
              ? '📋 Rezervasyonlar'
              : t === 'slots'
                ? '🕐 Slot Oluştur'
                : t === 'resources'
                  ? '🏟️ Kaynaklar'
                  : '🎾 Ek Hizmetler'}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Yükleniyor...</p>}

      {/* Bookings */}
      {!loading && tab === 'bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {bookings.length === 0 ? (
            <p className="muted">Henüz rezervasyon yok</p>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(148,163,184,0.1)',
                  background: 'rgba(0,0,0,0.15)',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{b.resourceName}</strong>
                    <span style={{ marginLeft: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                      {b.date} {b.startTime}-{b.endTime}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {statusBadge(b.status)}
                    <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{b.totalAmount}₺</span>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  👤 {b.userName} · {b.userEmail} {b.userPhone ? `· ${b.userPhone}` : ''}
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                  {fmtDate(b.createdAt)} · Ödeme: {b.paymentStatus}
                </div>
                {/* Action Buttons */}
                {b.status !== 'cancelled' && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleApprove(b.id)}
                        disabled={actionLoading === b.id}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(34,197,94,0.2)',
                          color: '#22c55e',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        ✅ Onayla
                      </button>
                    )}
                    {b.status === 'pending' && (
                      <button
                        onClick={() => handleReject(b.id)}
                        disabled={actionLoading === b.id}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(239,68,68,0.2)',
                          color: '#ef4444',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        ❌ Reddet
                      </button>
                    )}
                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handleAdminCancel(b.id)}
                        disabled={actionLoading === b.id}
                        style={{
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        🚫 İptal Et
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Slot Creation */}
      {!loading && tab === 'slots' && (
        <div style={{ maxWidth: '500px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Kaynak (Kort)
            </label>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
                fontSize: '0.9rem',
              }}
            >
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity} kişi) — {r.price}₺
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Tarih
            </label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Başlangıç Saati
              </label>
              <select
                value={slotStartHour}
                onChange={(e) => setSlotStartHour(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#e2e8f0',
                }}
              >
                {Array.from({ length: 19 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Bitiş Saati
              </label>
              <select
                value={slotEndHour}
                onChange={(e) => setSlotEndHour(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(148,163,184,0.2)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#e2e8f0',
                }}
              >
                {Array.from({ length: 19 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              Özel Fiyat (boş bırakılırsa kaynak fiyatı kullanılır)
            </label>
            <input
              type="number"
              value={slotPrice}
              onChange={(e) => setSlotPrice(e.target.value)}
              placeholder="Opsiyonel — örn: 3500"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
              }}
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
            {slotEndHour - slotStartHour} adet slot oluşturulacak (
            {slotStartHour.toString().padStart(2, '0')}:00 —{' '}
            {slotEndHour.toString().padStart(2, '0')}:00)
          </p>
          <button
            onClick={handleCreateSlots}
            disabled={creating || !selectedResource}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '10px',
              background: '#38bdf8',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              opacity: creating ? 0.5 : 1,
            }}
          >
            {creating ? '⏳ Oluşturuluyor...' : `✓ ${slotEndHour - slotStartHour} Slot Oluştur`}
          </button>
        </div>
      )}

      {/* Resources */}
      {!loading && tab === 'resources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resources.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.1)',
                background: 'rgba(0,0,0,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ color: '#e2e8f0' }}>{r.name}</strong>
                <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  {r.capacity} kişi · {r.durationMinutes} dk
                </span>
              </div>
              <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>
                {r.price}₺
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Addons */}
      {!loading && tab === 'addons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {addons.map((a) => (
            <div
              key={a.id}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.1)',
                background: 'rgba(0,0,0,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ color: '#e2e8f0' }}>{a.name}</strong>
                {a.description && (
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                    {a.description}
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1.1rem' }}>
                {a.price}₺
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
