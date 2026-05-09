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
  const [filter, setFilter] = useState('all');

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
    await apiJson(`/leads/${leadId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    await loadLeads();
  };

  const filtered = filter === 'all' ? leads : leads.filter((l) => l.status === filter);
  const newCount = leads.filter((l) => l.status === 'new').length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Gelen Talepler</h1>
          <p className="dashboard-subtitle">
            Keşif ekranından gelen iletişim talepleri
            {newCount > 0 && (
              <span className="badge-blue" style={{ marginLeft: 8 }}>
                {newCount} yeni
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tümü ({leads.length})
          </button>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-tab ${filter === opt.value ? 'filter-tab-active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label} ({leads.filter((l) => l.status === opt.value).length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>Talep bulunamadı</p>
        </div>
      ) : (
        <div className="leads-list">
          {filtered.map((lead) => (
            <div
              key={lead.id}
              className={`lead-card ${lead.status === 'new' ? 'lead-card-new' : ''}`}
            >
              <div className="lead-card-header">
                <div className="lead-person">
                  <strong>{lead.name}</strong>
                  <a href={`tel:${lead.phone}`} className="lead-phone">
                    {lead.phone}
                  </a>
                  {lead.email && <span className="lead-email">{lead.email}</span>}
                </div>
                <div className="lead-meta">
                  <span className="lead-source">{SOURCE_LABELS[lead.source] ?? lead.source}</span>
                  {lead.sourceLabel && (
                    <span className="lead-source-label">{lead.sourceLabel}</span>
                  )}
                </div>
              </div>
              {lead.message && <p className="lead-message">"{lead.message}"</p>}
              <div className="lead-card-footer">
                <select
                  value={lead.status}
                  onChange={(e) => {
                    void updateStatus(lead.id, e.target.value);
                  }}
                  className="lead-status-select"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="lead-date">
                  {new Date(lead.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <a href={`tel:${lead.phone}`} className="btn-sm btn-success">
                  📞 Ara
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
