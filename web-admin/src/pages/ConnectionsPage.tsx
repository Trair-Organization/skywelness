import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';

type ConnectionReq = {
  id: string;
  direction: string;
  connectionType: string;
  status: string;
  message: string | null;
  rejectReason: string | null;
  createdAt: string;
  respondedAt: string | null;
  sender: { name: string; publicId: string | null; role: string | null };
  receiver: { name: string; publicId: string | null; role: string | null };
};

const TYPE_LABELS: Record<string, string> = {
  trainer_to_club: '🏋️→🏢 Eğitmen → Kulüp',
  club_to_trainer: '🏢→🏋️ Kulüp → Eğitmen',
  member_to_club: '👤→🏢 Üye → Kulüp',
  club_to_member: '🏢→👤 Kulüp → Üye',
  member_to_trainer: '👤→🏋️ Üye → Eğitmen',
  trainer_to_member: '🏋️→👤 Eğitmen → Üye',
};

export function ConnectionsPage() {
  const [tab, setTab] = useState<'incoming' | 'sent' | 'accepted'>('incoming');
  const [incoming, setIncoming] = useState<ConnectionReq[]>([]);
  const [sent, setSent] = useState<ConnectionReq[]>([]);
  const [accepted, setAccepted] = useState<ConnectionReq[]>([]);
  const [loading, setLoading] = useState(true);

  // Send form
  const [showSend, setShowSend] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, snt, acc] = await Promise.all([
        apiJson<ConnectionReq[]>('/connections/incoming'),
        apiJson<ConnectionReq[]>('/connections/sent'),
        apiJson<ConnectionReq[]>('/connections/accepted'),
      ]);
      setIncoming(inc);
      setSent(snt);
      setAccepted(acc);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const handleAccept = async (id: string) => {
    try {
      await apiJson(`/connections/${id}/accept`, { method: 'POST' });
      alert('✅ Bağlantı kabul edildi');
      void load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Kabul edilemedi'}`);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Red sebebi (opsiyonel):');
    try {
      await apiJson(`/connections/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      alert('❌ İstek reddedildi');
      void load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Reddedilemedi'}`);
    }
  };

  const handleSend = async () => {
    if (!targetId.trim()) return;
    setSending(true);
    try {
      await apiJson('/connections/send-as-club', {
        method: 'POST',
        body: JSON.stringify({
          receiverPublicId: targetId.trim().toUpperCase(),
          message: sendMessage.trim() || undefined,
        }),
      });
      alert('✅ Bağlantı isteği gönderildi');
      setShowSend(false);
      setTargetId('');
      setSendMessage('');
      void load();
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Gönderilemedi'}`);
    } finally {
      setSending(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const currentList = tab === 'incoming' ? incoming : tab === 'sent' ? sent : accepted;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🔗 Bağlantılar</h1>
          <p className="muted">Eğitmen ve üye davetlerini yönetin</p>
        </div>
        <button className="btn-primary" onClick={() => setShowSend(!showSend)}>
          + Davet Gönder
        </button>
      </div>

      {/* Send Form */}
      {showSend && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background: 'rgba(56,189,248,0.04)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: '12px',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem', color: '#e2e8f0' }}>Bağlantı İsteği Gönder</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Alıcının ID'sini girin (MBR-0001, TRN-0001, CLB-0001)
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value.toUpperCase())}
              placeholder="TRN-0001"
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.2)',
                color: '#e2e8f0',
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '2px',
              }}
            />
            <input
              type="text"
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Mesaj (opsiyonel)"
              style={{
                flex: 2,
                minWidth: '200px',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(148,163,184,0.2)',
                background: 'rgba(0,0,0,0.2)',
                color: '#e2e8f0',
                fontSize: '0.9rem',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!targetId.trim() || sending}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                background: '#38bdf8',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                opacity: !targetId.trim() || sending ? 0.4 : 1,
              }}
            >
              {sending ? '⏳...' : '→ Gönder'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setTab('incoming')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border:
              tab === 'incoming'
                ? '1px solid rgba(56,189,248,0.3)'
                : '1px solid rgba(148,163,184,0.15)',
            background: tab === 'incoming' ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: tab === 'incoming' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Gelen {incoming.length > 0 ? `(${incoming.length})` : ''}
        </button>
        <button
          onClick={() => setTab('sent')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border:
              tab === 'sent'
                ? '1px solid rgba(56,189,248,0.3)'
                : '1px solid rgba(148,163,184,0.15)',
            background: tab === 'sent' ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: tab === 'sent' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Gönderilen
        </button>
        <button
          onClick={() => setTab('accepted')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border:
              tab === 'accepted'
                ? '1px solid rgba(56,189,248,0.3)'
                : '1px solid rgba(148,163,184,0.15)',
            background: tab === 'accepted' ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: tab === 'accepted' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Kabul Edilen
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : currentList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          {tab === 'incoming'
            ? 'Gelen istek yok'
            : tab === 'sent'
              ? 'Gönderilen istek yok'
              : 'Henüz kabul edilen bağlantı yok'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentList.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(148,163,184,0.1)',
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  {TYPE_LABELS[r.connectionType] ?? r.connectionType}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {fmtDate(r.createdAt)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
                  {tab === 'incoming' ? r.sender.name : r.receiver.name}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#38bdf8',
                    background: 'rgba(56,189,248,0.08)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {tab === 'incoming' ? r.sender.publicId : r.receiver.publicId}
                </span>
              </div>
              {r.message && (
                <p
                  style={{
                    margin: '0.5rem 0 0',
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    fontStyle: 'italic',
                  }}
                >
                  💬 {r.message}
                </p>
              )}
              {tab === 'incoming' && r.status === 'pending' && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => handleAccept(r.id)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(34,197,94,0.3)',
                      background: 'rgba(34,197,94,0.08)',
                      color: '#22c55e',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✓ Kabul Et
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    style={{
                      flex: 1,
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(239,68,68,0.2)',
                      background: 'rgba(239,68,68,0.05)',
                      color: '#ef4444',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Reddet
                  </button>
                </div>
              )}
              {tab === 'sent' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color:
                        r.status === 'accepted'
                          ? '#22c55e'
                          : r.status === 'rejected'
                            ? '#ef4444'
                            : '#f59e0b',
                    }}
                  >
                    {r.status === 'pending'
                      ? '⏳ Bekliyor'
                      : r.status === 'accepted'
                        ? '✅ Kabul Edildi'
                        : r.status === 'rejected'
                          ? '❌ Reddedildi'
                          : '🚫 İptal'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
