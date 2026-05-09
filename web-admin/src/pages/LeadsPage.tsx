import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiJson } from '../lib/api';

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string;
  sourceRef: string | null;
  sourceLabel: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  tenant?: { name: string } | null;
};

const STATUS_OPTIONS = [
  { value: 'new', label: '🆕 Yeni', color: 'badge-blue' },
  { value: 'contacted', label: '📞 İletişime Geçildi', color: 'badge-yellow' },
  { value: 'converted', label: '✅ Dönüştürüldü', color: 'badge-green' },
  { value: 'lost', label: '❌ Kayıp', color: 'badge-gray' },
];

const SOURCE_LABELS: Record<string, string> = {
  club: '🏢 Kulüp',
  trainer: '🏋️ Eğitmen',
  campaign: '🔥 Kampanya',
  event: '📅 Etkinlik',
};

export function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const isPlatformAdmin = user?.role === 'platform_admin';
  const endpoint = isPlatformAdmin ? '/leads/platform' : '/leads/admin';

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiJson<Lead[]>(endpoint);
      setLeads(rows);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadLeads();
    });
  }, [loadLeads]);

  const updateStatus = async (leadId: string, status: string) => {
    await apiJson(`/leads/${leadId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadLeads();
  };

  const newCount = leads.filter((l) => l.status === 'new').length;

  return (
    <div className="shell">
      <div className="page-header">
        <h1>
          📋 Gelen Talepler{' '}
          {newCount > 0 && <span className="badge badge-blue">{newCount} yeni</span>}
        </h1>
      </div>

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : leads.length === 0 ? (
        <div className="card empty-state">
          <p>Henüz talep gelmedi.</p>
          <p className="muted">Keşif ekranından gelen iletişim talepleri burada görünecek.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Telefon</th>
                <th>Kaynak</th>
                <th>Mesaj</th>
                <th>Durum</th>
                <th>Tarih</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.name}</strong>
                    {lead.email && (
                      <div className="muted" style={{ fontSize: 11 }}>
                        {lead.email}
                      </div>
                    )}
                  </td>
                  <td>
                    <a href={`tel:${lead.phone}`}>{lead.phone}</a>
                  </td>
                  <td>
                    <span>{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                    {lead.sourceLabel && (
                      <div className="muted" style={{ fontSize: 11 }}>
                        {lead.sourceLabel}
                      </div>
                    )}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {lead.message ?? '—'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={lead.status}
                      onChange={(e) => {
                        void updateStatus(lead.id, e.target.value);
                      }}
                      className="small-select"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {new Date(lead.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td>
                    <a href={`tel:${lead.phone}`} className="small primary">
                      📞 Ara
                    </a>
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
