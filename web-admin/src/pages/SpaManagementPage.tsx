import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { TherapistsPage } from './TherapistsPage';

type SpaServiceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  price: number;
  active: boolean;
  sortOrder: number;
};
type SpaBookingRow = {
  id: string;
  bookingDate: string;
  timeSlot: string;
  status: string;
  notes: string | null;
  adminNote: string | null;
  service: { id: string; name: string } | null;
  therapist: { id: string; name: string } | null;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
};

type TabType = 'bookings' | 'services' | 'therapists' | 'room-slots';

export function SpaManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [bookings, setBookings] = useState<SpaBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState('pending');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [svc, bk] = await Promise.all([
        apiJson<SpaServiceRow[]>('/spa/admin/services'),
        apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${bookingFilter}`),
      ]);
      setServices(svc);
      setBookings(bk);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [bookingFilter]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
  }, [loadAll]);

  async function updateBookingStatus(id: string, status: string) {
    try {
      await apiJson(`/spa/admin/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const data = await apiJson<SpaBookingRow[]>(`/spa/admin/bookings?status=${bookingFilter}`);
      setBookings(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
    }
  }

  function getStatusLabel(s: string) {
    return (
      { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' }[
        s
      ] || s
    );
  }
  function getCategoryLabel(c: string) {
    return (
      {
        relax: '🧘 Relax',
        therapy: '💆 Therapy',
        recovery: '🔄 Recovery',
        sport: '⚡ Sport',
        premium: '👑 Premium',
      }[c] || c
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Spa Hizmetleri & Rezervasyonlar</h1>
          <p className="dashboard-subtitle">Masaj hizmetlerini ve gelen rezervasyonları yönetin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeTab === 'bookings' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📝 Rezervasyonlar
          </button>
          <button
            className={`filter-tab ${activeTab === 'services' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            🧴 Hizmetler ({services.length})
          </button>
          <button
            className={`filter-tab ${activeTab === 'therapists' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('therapists')}
          >
            💆 Masözler
          </button>
          <button
            className={`filter-tab ${activeTab === 'room-slots' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('room-slots')}
          >
            🏠 Oda Slotları
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Yükleniyor...</p>}

      {!loading && (
        <>
          {/* Rezervasyonlar */}
          {activeTab === 'bookings' && (
            <div>
              <div className="booking-filters">
                {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    className={`btn-sm ${bookingFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setBookingFilter(s);
                    }}
                  >
                    {getStatusLabel(s)}
                  </button>
                ))}
              </div>
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>Bu durumda rezervasyon yok</p>
                </div>
              ) : (
                <div className="members-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Üye</th>
                        <th>Hizmet</th>
                        <th>Masöz</th>
                        <th>Tarih</th>
                        <th>Saat</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td>{b.user ? `${b.user.firstName} ${b.user.lastName}` : '-'}</td>
                          <td>{b.service?.name || '-'}</td>
                          <td>{b.therapist?.name || '-'}</td>
                          <td>{b.bookingDate}</td>
                          <td>{b.timeSlot}</td>
                          <td>
                            <span className={`status-badge status-spa-${b.status}`}>
                              {getStatusLabel(b.status)}
                            </span>
                          </td>
                          <td>
                            {b.status === 'pending' && (
                              <div className="action-btns">
                                <button
                                  className="btn-sm btn-success"
                                  onClick={() => void updateBookingStatus(b.id, 'confirmed')}
                                >
                                  ✓ Onayla
                                </button>
                                <button
                                  className="btn-sm btn-danger"
                                  onClick={() => void updateBookingStatus(b.id, 'cancelled')}
                                >
                                  ✗ İptal
                                </button>
                              </div>
                            )}
                            {b.status === 'confirmed' && (
                              <button
                                className="btn-sm btn-success"
                                onClick={() => void updateBookingStatus(b.id, 'completed')}
                              >
                                ✓ Tamamlandı
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Hizmetler */}
          {activeTab === 'services' && (
            <div className="services-grid">
              {services.map((s) => (
                <div key={s.id} className="service-card">
                  <div className="service-card-header">
                    <span className="service-category">{getCategoryLabel(s.category)}</span>
                    <span className={`service-status ${s.active ? 'active' : 'inactive'}`}>
                      {s.active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <h3 className="service-name">{s.name}</h3>
                  {s.description && (
                    <p className="service-desc">{s.description.slice(0, 120)}...</p>
                  )}
                  <div className="service-meta">
                    <span>⏱ {s.durationMinutes} dk</span>
                    <span className="service-price">₺{s.price.toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Masözler */}
          {activeTab === 'therapists' && <TherapistsPage embedded />}

          {/* Oda Slotları */}
          {activeTab === 'room-slots' && <RoomSlotsTab />}
        </>
      )}
    </div>
  );
}

// ─── Room Slots Tab ─────────────────────────────────────────────────────────────

type RoomRow = { id: string; name: string; resourceType: string; capacity: number; price: string };

function RoomSlotsTab() {
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(21);
  const [price, setPrice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ created: number; roomName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiJson<RoomRow[]>('/resource-booking/admin/resources')
      .then((data) => {
        const massageRooms = data.filter((r) => r.resourceType === 'massage_room');
        setRooms(massageRooms);
        if (massageRooms.length > 0) setSelectedRoom(massageRooms[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    if (!selectedRoom) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiJson<{ created: number; roomName: string }>(
        '/v2/schedule/generate-room-slots',
        {
          method: 'POST',
          body: JSON.stringify({
            roomId: selectedRoom,
            startDate,
            endDate,
            startHour,
            endHour,
            price: price ? parseFloat(price) : undefined,
          }),
        },
      );
      setResult(res);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Slot oluşturulamadı');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>;

  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🏠</span>
        <p>Henüz masaj odası tanımlı değil. Kaynak yönetiminden oda ekleyin.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>
        🏠 Masaj Odası Slot Oluşturma
      </h2>
      <p className="muted" style={{ marginBottom: '1.5rem' }}>
        Masaj odaları için müsaitlik slotları oluşturun. Oda slotları, masöz slotlarıyla birlikte
        çalışarak oda bazlı rezervasyon sağlar.
      </p>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Oda Seçimi */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
            Masaj Odası
          </span>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            style={{
              padding: '0.65rem',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#e2e8f0',
              fontSize: '0.9rem',
            }}
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.capacity} kişi) — {r.price}₺
              </option>
            ))}
          </select>
        </label>

        {/* Tarih Aralığı */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
              Başlangıç
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.6rem',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>Bitiş</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.6rem',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
              }}
            />
          </label>
        </div>

        {/* Saat Aralığı */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
              Başlangıç Saati
            </span>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              style={{
                padding: '0.6rem',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
              }}
            >
              {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
              Bitiş Saati
            </span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              style={{
                padding: '0.6rem',
                borderRadius: 8,
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#e2e8f0',
              }}
            >
              {Array.from({ length: 16 }, (_, i) => i + 8).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Fiyat Override */}
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>
            Özel Fiyat (boş = oda fiyatı)
          </span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Opsiyonel"
            style={{
              padding: '0.6rem',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: '#e2e8f0',
            }}
          />
        </label>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
        {(() => {
          const days =
            Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
          const slotsPerDay = endHour - startHour;
          return `${days} gün × ${slotsPerDay} slot/gün = ${days * slotsPerDay} slot oluşturulacak`;
        })()}
      </p>

      <button
        onClick={handleGenerate}
        disabled={generating || !selectedRoom}
        style={{
          width: '100%',
          padding: '0.85rem',
          borderRadius: 10,
          background: '#38bdf8',
          color: '#0a0f1a',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.95rem',
          opacity: generating ? 0.5 : 1,
        }}
      >
        {generating ? '⏳ Oluşturuluyor...' : '🏠 Oda Slotlarını Oluştur'}
      </button>

      {result && (
        <p style={{ color: '#10b981', fontWeight: 700, marginTop: '1rem' }}>
          ✅ {result.created} slot başarıyla oluşturuldu ({result.roomName})
        </p>
      )}
    </div>
  );
}
