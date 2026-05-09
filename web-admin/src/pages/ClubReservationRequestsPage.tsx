import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiJson } from '../lib/api';

type ReservationRequest = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  trainer: { user: { firstName: string; lastName: string } };
};

export function ClubReservationRequestsPage() {
  const [rows, setRows] = useState<ReservationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<ReservationRequest[]>('/admin/reservation-requests', {
        method: 'GET',
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Rezervasyon talepleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function approve(id: string) {
    await apiJson(`/admin/reservation-requests/${id}/approve`, { method: 'POST' });
    await load();
  }

  async function reject(id: string) {
    await apiJson(`/admin/reservation-requests/${id}/reject`, { method: 'POST' });
    await load();
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Masaj Rezervasyon Talepleri</h1>
          <p className="dashboard-subtitle">
            Mobil uygulamadan gelen masaj randevu taleplerini yönetin
          </p>
        </div>
        <button className="btn-sm btn-outline" onClick={() => void load()} disabled={loading}>
          {loading ? 'Yükleniyor...' : '🔄 Yenile'}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>Bekleyen talep yok</p>
        </div>
      ) : (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Masöz</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.trainer.user.firstName} {row.trainer.user.lastName}
                  </td>
                  <td>{new Date(row.startTime).toLocaleString('tr-TR')}</td>
                  <td>{new Date(row.endTime).toLocaleString('tr-TR')}</td>
                  <td>{row.status}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="link" onClick={() => void approve(row.id)}>
                      Onayla
                    </button>
                    <button type="button" className="secondary" onClick={() => void reject(row.id)}>
                      Reddet
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>Bekleyen talep yok.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
