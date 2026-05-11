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

type TabType = 'bookings' | 'services' | 'therapists';

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
        </>
      )}
    </div>
  );
}
