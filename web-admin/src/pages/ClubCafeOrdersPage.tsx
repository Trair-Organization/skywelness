import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="shell">
      <header className="topbar">
        <h1>SkyCafe Siparisleri</h1>
        <div className="topbarActions">
          <button
            type="button"
            className="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? 'Yukleniyor...' : 'Yenile'}
          </button>
          <Link className="secondary" to="/club/dashboard">
            Panele Don
          </Link>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      <section className="card">
        <table className="table">
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
      </section>
    </div>
  );
}
