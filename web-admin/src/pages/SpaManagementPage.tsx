import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';

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

type TherapistRow = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[] | null;
  avgRating: string;
  active: boolean;
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

type TabType = 'services' | 'therapists' | 'bookings';

export function SpaManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [services, setServices] = useState<SpaServiceRow[]>([]);
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [bookings, setBookings] = useState<SpaBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingFilter, setBookingFilter] = useState('pending');

  const loadServices = useCallback(async () => {
    try {
      const data = await apiJson<SpaServiceRow[]>('/spa/admin/services');
      setServices(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Hizmetler yüklenemedi');
    }
  }, []);

  const loadTherapists = useCallback(async () => {
    try {
      const data = await apiJson<TherapistRow[]>('/spa/admin/therapists');
      setTherapists(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Masözler yüklenemedi');
    }
  }, []);

  const loadBookings = useCallback(async (status?: string) => {
    try {
      const qs = status ? `?status=${status}` : '';
      const data = await apiJson<SpaBookingRow[]>(`/spa/admin/bookings${qs}`);
      setBookings(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Rezervasyonlar yüklenemedi');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadServices(), loadTherapists(), loadBookings(bookingFilter)]);
    setLoading(false);
  }, [loadServices, loadTherapists, loadBookings, bookingFilter]);

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
      await loadBookings(bookingFilter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'İşlem başarısız');
    }
  }

  function getCategoryLabel(cat: string) {
    const map: Record<string, string> = {
      relax: '🧘 Relax',
      therapy: '💆 Therapy',
      recovery: '🔄 Recovery',
      sport: '⚡ Sport',
      premium: '👑 Premium',
    };
    return map[cat] || cat;
  }

  function getStatusLabel(status: string) {
    const map: Record<string, string> = {
      pending: 'Bekliyor',
      confirmed: 'Onaylandı',
      completed: 'Tamamlandı',
      cancelled: 'İptal',
    };
    return map[status] || status;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Spa & Wellness Yönetimi</h1>
          <p className="dashboard-subtitle">Hizmetler, masözler ve rezervasyonları yönetin</p>
        </div>
      </div>

      {/* Tab Navigation */}
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
            💆 Hizmetler ({services.length})
          </button>
          <button
            className={`filter-tab ${activeTab === 'therapists' ? 'filter-tab-active' : ''}`}
            onClick={() => setActiveTab('therapists')}
          >
            🧑‍⚕️ Masözler ({therapists.length})
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : (
        <>
          {/* Rezervasyonlar Tab */}
          {activeTab === 'bookings' && (
            <div className="spa-section">
              <div className="booking-filters">
                {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
                  <button
                    key={s}
                    className={`btn-sm ${bookingFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setBookingFilter(s);
                      void loadBookings(s);
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

          {/* Hizmetler Tab */}
          {activeTab === 'services' && (
            <div className="spa-section">
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
                      <p className="service-desc">{s.description.slice(0, 100)}...</p>
                    )}
                    <div className="service-meta">
                      <span>⏱ {s.durationMinutes} dk</span>
                      <span className="service-price">₺{s.price.toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Masözler Tab */}
          {activeTab === 'therapists' && (
            <div className="spa-section">
              <div className="therapists-grid">
                {therapists.map((t) => (
                  <div key={t.id} className="therapist-card">
                    <div className="therapist-avatar">
                      {t.photoUrl ? (
                        <img src={t.photoUrl} alt={t.name} />
                      ) : (
                        <span>{t.name[0]}</span>
                      )}
                    </div>
                    <h3>{t.name}</h3>
                    {t.bio && <p className="therapist-bio">{t.bio}</p>}
                    <div className="therapist-meta">
                      <span>⭐ {Number(t.avgRating).toFixed(1)}</span>
                      <span className={t.active ? 'text-green' : 'text-red'}>
                        {t.active ? '● Aktif' : '● Pasif'}
                      </span>
                    </div>
                    {t.specialties && t.specialties.length > 0 && (
                      <div className="trainer-tags">
                        {t.specialties.map((sp, i) => (
                          <span key={i} className="tag">
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
