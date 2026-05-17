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
  password_change: '🔑 Şifre değiştirildi',
  member_suspended: '❄️ Hesap donduruldu',
  member_reactivated: '✅ Hesap aktifleştirildi',
  member_add_by_code: '👥 Kod ile üye eklendi',
  package_assigned: '📦 Paket atandı',
  package_deleted: '🗑 Paket silindi',
  sessions_added: '➕ Seans eklendi',
  membership_set: '🎫 Üyelik güncellendi',
  profile_updated: '✏️ Profil güncellendi',
  event_approved: '📅 Etkinlik onaylandı',
  event_rejected: '📅 Etkinlik reddedildi',
  trainer_created: '🏋️ Eğitmen oluşturuldu',
  trainer_deleted: '🗑 Eğitmen silindi',
  trainer_assigned: '🏋️ Eğitmen atandı',
  trainer_removed: '🏋️ Eğitmen çıkarıldı',
  push_sent: '🔔 Bildirim gönderildi',
  bulk_sms: '📱 Toplu SMS',
  bulk_email: '📧 Toplu Email',
  campaign_created: '🔥 Kampanya oluşturuldu',
  reservation_cancelled: '❌ Randevu iptal',
  reservation_created: '📅 Randevu oluşturuldu',
};

const ACTION_CATEGORIES: Record<string, string[]> = {
  'Üye İşlemleri': ['member_approved', 'member_rejected', 'member_deleted', 'member_suspended', 'member_reactivated', 'member_add_by_code'],
  'Güvenlik': ['password_reset', 'password_change'],
  'Paket/Üyelik': ['package_assigned', 'package_deleted', 'sessions_added', 'membership_set'],
  'Etkinlik': ['event_approved', 'event_rejected'],
  'Diğer': ['profile_updated', 'trainer_created', 'trainer_deleted', 'push_sent', 'campaign_created'],
};

function formatDetails(action: string, details: Record<string, unknown>): string {
  const d = details;
  switch (action) {
    case 'member_approved': return 'Üyelik başvurusu onaylandı';
    case 'member_rejected': return 'Üyelik başvurusu reddedildi';
    case 'member_deleted': return 'Üye hesabı silindi';
    case 'member_suspended': return d.reason ? `Sebep: ${d.reason}` : 'Hesap donduruldu';
    case 'member_reactivated': return 'Hesap tekrar aktifleştirildi';
    case 'member_add_by_code': return d.mode === 'invite' ? 'Davet olarak eklendi' : 'Direkt eklendi';
    case 'password_reset': return 'Geçici şifre oluşturuldu';
    case 'password_change': return 'Yeni şifre atandı';
    case 'package_assigned': return d.packageName ? `Paket: ${d.packageName}` : 'Paket atandı';
    case 'package_deleted': return 'Paket silindi';
    case 'sessions_added': return d.newTotal ? `Yeni toplam: ${d.newTotal} seans` : 'Seans eklendi';
    case 'membership_set': return d.membershipType ? `Tür: ${d.membershipType}` : 'Üyelik güncellendi';
    case 'profile_updated': return 'Profil bilgileri güncellendi';
    case 'event_approved': return 'Etkinlik yayına alındı';
    case 'event_rejected': return d.reason ? `Sebep: ${d.reason}` : 'Etkinlik reddedildi';
    case 'trainer_created': return 'Yeni eğitmen hesabı oluşturuldu';
    case 'trainer_deleted': return 'Eğitmen hesabı silindi';
    case 'trainer_assigned': return 'Eğitmen üyeye atandı';
    case 'trainer_removed': return 'Eğitmen üyeden çıkarıldı';
    case 'push_sent': return d.target ? `Hedef: ${d.target === 'all' ? 'Herkes' : d.target === 'members' ? 'Üyeler' : 'Personel'}` : 'Bildirim gönderildi';
    case 'bulk_sms': return `${d.sent || 0} kişiye SMS gönderildi`;
    case 'bulk_email': return `${d.sent || 0} kişiye email gönderildi`;
    case 'campaign_created': return 'Yeni kampanya oluşturuldu';
    case 'reservation_cancelled': return 'Randevu iptal edildi';
    case 'reservation_created': return 'Randevu oluşturuldu';
    default: {
      const entries = Object.entries(d).slice(0, 2);
      if (entries.length === 0) return '—';
      const DETAIL_LABELS: Record<string, string> = {
        trainerId: 'Eğitmen', userId: 'Kullanıcı', memberId: 'Üye',
        sent: 'Gönderilen', count: 'Toplam', failed: 'Başarısız',
        messagePreview: 'Mesaj', reason: 'Sebep', note: 'Not',
        packageName: 'Paket', newTotal: 'Yeni toplam',
      };
      return entries.map(([k, v]) => {
        const label = DETAIL_LABELS[k] || k;
        const val = String(v).slice(0, 30);
        return `${label}: ${val}`;
      }).join(' • ');
    }
  }
}

export function ClubLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try { setLogs(await apiJson<LogEntry[]>('/admin/logs')); }
    catch { setLogs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  // Filter
  const filtered = logs
    .filter(l => !filterAction || l.action === filterAction)
    .filter(l => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const label = (ACTION_LABELS[l.action] || l.action).toLowerCase();
      return label.includes(q) || l.targetId?.toLowerCase().includes(q) || JSON.stringify(l.details).toLowerCase().includes(q);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = logs.filter(l => l.createdAt.slice(0, 10) === today).length;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekCount = logs.filter(l => l.createdAt >= weekAgo).length;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>📜 Log Kayıtları</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Tüm admin işlemleri — bu kayıtlar silinemez</p>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="stat-mini"><span className="stat-mini-val">{logs.length}</span><span className="stat-mini-lbl">Toplam Kayıt</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{todayCount}</span><span className="stat-mini-lbl">Bugün</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{weekCount}</span><span className="stat-mini-lbl">Bu Hafta</span></div>
        <div className="stat-mini"><span className="stat-mini-val">{Object.keys(ACTION_LABELS).length}</span><span className="stat-mini-lbl">İşlem Türü</span></div>
      </div>

      {/* Filtreler */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 13 }}>
          <option value="">Tüm İşlemler</option>
          {Object.entries(ACTION_CATEGORIES).map(([group, actions]) => (
            <optgroup key={group} label={group}>
              {actions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
            </optgroup>
          ))}
        </select>
        <input type="text" placeholder="🔍 Ara (işlem, hedef ID, detay)..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 13 }} />
      </div>

      {/* Tablo */}
      {loading ? (
        <p style={{ color: '#64748b' }}>Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>Filtrelerle eşleşen kayıt bulunamadı.</p>
      ) : (
        <>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
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
                {paginated.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>
                        {new Date(log.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {new Date(log.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{ACTION_LABELS[log.action] || log.action}</span>
                    </td>
                    <td style={tdStyle}>
                      {log.targetType && (
                        <div>
                          <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>{log.targetType}</span>
                          {log.targetId && <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: 4, fontFamily: 'monospace' }}>{log.targetId.slice(0, 8)}</span>}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      {Object.keys(log.details).length > 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {formatDetails(log.action, log.details)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 12, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>← Önceki</button>
              <span style={{ fontSize: 13, color: '#64748b' }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 12, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>Sonraki →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: '0.78rem',
  textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px', color: '#374151', verticalAlign: 'middle',
};
