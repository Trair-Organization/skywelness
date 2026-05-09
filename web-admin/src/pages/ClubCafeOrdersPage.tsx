import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiJson } from '../lib/api';

type CafeOrderItem = {
  productId: string;
  title: string;
  unitPrice: number;
  quantity: number;
};

type CafeOrder = {
  id: string;
  customerName: string;
  blockLabel: string;
  apartmentLabel: string;
  phoneNumber: string;
  paymentMethod: 'cash' | 'card';
  status: 'pending' | 'cancelled' | 'completed';
  totalAmount: number;
  createdAt: string;
  items: CafeOrderItem[];
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export function ClubCafeOrdersPage() {
  const [rows, setRows] = useState<CafeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson<CafeOrder[]>('/admin/cafe-orders', { method: 'GET' });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Siparisler yuklenemedi');
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

  async function cancelOrder(id: string) {
    try {
      await apiJson(`/admin/cafe-orders/${id}/cancel`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Siparis iptal edilemedi');
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">☕ SkyCafe Siparişleri</h1>
          <p className="dashboard-subtitle">Üyelerin verdiği cafe siparişlerini takip edin</p>
        </div>
        <button className="btn-sm btn-outline" onClick={() => void load()} disabled={loading}>
          {loading ? 'Yükleniyor...' : '🔄 Yenile'}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">☕</span>
          <p>Henüz sipariş yok</p>
        </div>
      ) : (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Uye</th>
                <th>Adres</th>
                <th>Odeme</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th>Urunler</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.createdAt).toLocaleString('tr-TR')}</td>
                  <td>
                    {row.customerName}
                    <br />
                    <span className="muted">{row.phoneNumber}</span>
                  </td>
                  <td>
                    {row.blockLabel} / {row.apartmentLabel}
                  </td>
                  <td>{row.paymentMethod === 'cash' ? 'Nakit' : 'Kart'}</td>
                  <td>{formatMoney(row.totalAmount)}</td>
                  <td>{row.status}</td>
                  <td>{row.items.map((item) => `${item.title} x${item.quantity}`).join(', ')}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      disabled={row.status !== 'pending'}
                      onClick={() => void cancelOrder(row.id)}
                    >
                      Iptal Et
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
