import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type LogEntry = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  actorUserId: string;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  member_approved: '✅ Üye onaylandı',
  member_rejected: '❌ Üye reddedildi',
  member_deleted: '🗑 Üye silindi',
  password_reset: '🔑 Şifre sıfırlandı',
  member_suspended: '❄️ Hesap donduruldu',
  member_reactivated: '✅ Hesap aktifleştirildi',
  package_assigned: '📦 Paket atandı',
  package_deleted: '🗑 Paket silindi',
  sessions_added: '➕ Seans eklendi',
  membership_set: '🎫 Üyelik güncellendi',
  profile_updated: '✏️ Profil güncellendi',
};

export function ClubLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await apiJson<LogEntry[]>('/admin/logs'));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
          📜 İşlem Kayıtları
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          Tüm admin işlemleri burada kayıt altına alınır. Bu kayıtlar silinemez.
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Yükleniyor...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Henüz işlem kaydı yok.</p>
      ) : (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Tarih</th>
                <th style={thStyle}>İşlem</th>
                <th style={thStyle}>Hedef</th>
                <th style={thStyle}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    {new Date(log.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {log.targetType && (
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {log.targetType} {log.targetId?.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    {Object.keys(log.details).length > 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {JSON.stringify(log.details).slice(0, 60)}
                      </span>
                    )}
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

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  color: '#374151',
  verticalAlign: 'middle',
};
