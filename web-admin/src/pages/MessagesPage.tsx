import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiJson } from '../lib/api';

type ConversationRow = {
  id: string;
  otherUser: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    role: string;
  };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageSenderId: string | null;
  isLastMessageMine: boolean;
  unreadCount: number;
};

type BlockedUserRow = {
  id: string;
  blockedAt: string;
  reason: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl: string | null;
    role: string;
  } | null;
};

type MessageRow = {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  isOwn: boolean;
};

type ReportCategory =
  | 'spam'
  | 'harassment'
  | 'inappropriate'
  | 'fake_profile'
  | 'violence'
  | 'other';

const REPORT_CATEGORIES: Array<{ key: ReportCategory; label: string; icon: string }> = [
  { key: 'spam', label: 'Spam / Reklam', icon: '📢' },
  { key: 'harassment', label: 'Taciz / Hakaret', icon: '😡' },
  { key: 'inappropriate', label: 'Uygunsuz İçerik', icon: '⚠️' },
  { key: 'fake_profile', label: 'Sahte Profil / Dolandırıcılık', icon: '🎭' },
  { key: 'violence', label: 'Şiddet / Tehdit', icon: '⛔' },
  { key: 'other', label: 'Diğer', icon: '❓' },
];

function roleLabel(role: string) {
  switch (role) {
    case 'member':
      return '👤 Üye';
    case 'trainer':
    case 'independent_trainer':
      return '🏋️ Eğitmen';
    case 'administrator':
      return '🏢 Kulüp Admin';
    case 'platform_admin':
      return '⚙️ Platform';
    default:
      return role;
  }
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Şimdi';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}dk`;
  if (diff < 86400000)
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function MessagesPage() {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'inbox' | 'sent' | 'blocked'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Action menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Report modal
  const [reportTarget, setReportTarget] = useState<{
    userId: string;
    conversationId: string;
    userName: string;
  } | null>(null);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await apiJson<ConversationRow[]>('/messages/conversations');
      setConversations(rows);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBlocked = useCallback(async () => {
    try {
      const rows = await apiJson<BlockedUserRow[]>('/messages/users/blocked');
      setBlockedUsers(rows);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiJson<ConversationRow[]>('/messages/conversations')
      .then((rows) => {
        if (!cancelled) {
          setConversations(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    apiJson<BlockedUserRow[]>('/messages/users/blocked')
      .then((rows) => {
        if (!cancelled) setBlockedUsers(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Poll
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      void loadConversations();
    }, 8000);
    return () => clearInterval(id);
  }, [token, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const rows = await apiJson<MessageRow[]>(`/messages/conversations/${convId}?limit=100`);
      setMessages(rows);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      /* */
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const openConversation = (conv: ConversationRow) => {
    setActiveConv(conv);
    void loadMessages(conv.id);
  };

  useEffect(() => {
    if (!activeConv) return;
    const id = setInterval(() => {
      void loadMessages(activeConv.id);
    }, 5000);
    return () => clearInterval(id);
  }, [activeConv, loadMessages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConv || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      await apiJson(`/messages/conversations/${activeConv.id}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      await loadMessages(activeConv.id);
      await loadConversations();
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  // ═══ MODERATION ═══

  const deleteConversation = async (convId: string) => {
    if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/messages/conversations/${convId}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConv?.id === convId) setActiveConv(null);
    } catch {
      alert('Sohbet silinemedi');
    }
    setMenuOpenId(null);
  };

  const blockUser = async (userId: string, userName: string, convId: string) => {
    if (!confirm(`${userName} kullanıcısını engellemek istediğinize emin misiniz?`)) return;
    try {
      await apiJson(`/messages/users/${userId}/block`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConv?.id === convId) setActiveConv(null);
      await loadBlocked();
    } catch {
      alert('Engelleme başarısız');
    }
    setMenuOpenId(null);
  };

  const unblockUser = async (userId: string, userName: string) => {
    if (!confirm(`${userName} için engeli kaldırmak istediğinize emin misiniz?`)) return;
    try {
      await apiJson(`/messages/users/${userId}/block`, { method: 'DELETE' });
      setBlockedUsers((prev) => prev.filter((b) => b.user?.id !== userId));
    } catch {
      alert('Engel kaldırılamadı');
    }
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setSubmittingReport(true);
    try {
      await apiJson('/messages/reports', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: reportTarget.userId,
          conversationId: reportTarget.conversationId,
          category: reportCategory,
          description: reportDescription.trim() || undefined,
        }),
      });
      alert('Şikayetiniz alındı, 24 saat içinde incelenecek');
      setReportTarget(null);
      setReportDescription('');
      setReportCategory('spam');
    } catch {
      alert('Şikayet gönderilemedi');
    } finally {
      setSubmittingReport(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'inbox') return !c.isLastMessageMine;
    if (activeTab === 'sent') return c.isLastMessageMine;
    return false;
  });

  const inboxCount = conversations.filter((c) => !c.isLastMessageMine && c.lastMessageAt).length;
  const sentCount = conversations.filter((c) => c.isLastMessageMine).length;

  return (
    <div className="shell" onClick={() => setMenuOpenId(null)}>
      <h1>💬 Mesajlar</h1>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all' as const, label: `Tümü (${conversations.length})` },
          { key: 'inbox' as const, label: `📥 Gelen (${inboxCount})` },
          { key: 'sent' as const, label: `📤 Gönderilen (${sentCount})` },
          { key: 'blocked' as const, label: `🚫 Engellenenler (${blockedUsers.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setActiveConv(null);
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid',
              borderColor: activeTab === tab.key ? '#38bdf8' : 'rgba(148,163,184,0.2)',
              background: activeTab === tab.key ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.4)',
              color: activeTab === tab.key ? '#38bdf8' : '#94a3b8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'blocked' ? (
        // Engellenenler Listesi
        <div>
          {blockedUsers.length === 0 ? (
            <p className="muted">🚫 Henüz engellediğiniz kullanıcı yok.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {blockedUsers.map((b) => {
                if (!b.user) return null;
                const fullName = `${b.user.firstName} ${b.user.lastName}`.trim();
                return (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(15,23,42,0.4)',
                      border: '1px solid rgba(148,163,184,0.15)',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        background: 'rgba(239,68,68,0.15)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444',
                        fontWeight: 700,
                      }}
                    >
                      {b.user.firstName[0]}
                      {b.user.lastName[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{fullName}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>
                        {roleLabel(b.user.role)} · Engellendi {timeAgo(b.blockedAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => unblockUser(b.user!.id, fullName)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid #38bdf8',
                        background: 'rgba(56,189,248,0.1)',
                        color: '#38bdf8',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Engeli Kaldır
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="messages-layout">
          {/* Conversation List */}
          <div className="messages-sidebar">
            {loading ? (
              <p className="muted">Yükleniyor...</p>
            ) : filteredConversations.length === 0 ? (
              <p className="muted">
                {activeTab === 'inbox'
                  ? 'Gelen mesaj yok.'
                  : activeTab === 'sent'
                    ? 'Gönderilen mesaj yok.'
                    : 'Henüz mesajınız yok.'}
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conv-row ${activeConv?.id === conv.id ? 'conv-row-active' : ''}`}
                  onClick={() => openConversation(conv)}
                  style={{ position: 'relative' }}
                >
                  <div className="conv-avatar">
                    {conv.otherUser.firstName[0]}
                    {conv.otherUser.lastName[0]}
                  </div>
                  <div className="conv-info">
                    <div className="conv-top">
                      <span className="conv-name">
                        {conv.otherUser.firstName} {conv.otherUser.lastName}
                      </span>
                      <span className="conv-time">{timeAgo(conv.lastMessageAt)}</span>
                    </div>
                    <span className="conv-role">{roleLabel(conv.otherUser.role)}</span>
                    {conv.lastMessagePreview && (
                      <span
                        className={`conv-preview ${conv.unreadCount > 0 ? 'conv-preview-unread' : ''}`}
                      >
                        {conv.isLastMessageMine ? '📤 ' : ''}
                        {conv.lastMessagePreview}
                      </span>
                    )}
                  </div>
                  {conv.unreadCount > 0 && <span className="conv-badge">{conv.unreadCount}</span>}

                  {/* 3-dot menu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: 18,
                      cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                    title="Aksiyonlar"
                  >
                    ⋯
                  </button>

                  {menuOpenId === conv.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '100%',
                        zIndex: 10,
                        background: '#1e293b',
                        border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        minWidth: 180,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        onClick={() => {
                          setReportTarget({
                            userId: conv.otherUser.id,
                            conversationId: conv.id,
                            userName: `${conv.otherUser.firstName} ${conv.otherUser.lastName}`,
                          });
                          setMenuOpenId(null);
                        }}
                        style={menuItemStyle('#f59e0b')}
                      >
                        🚩 Şikayet Et
                      </button>
                      <button
                        onClick={() =>
                          blockUser(
                            conv.otherUser.id,
                            `${conv.otherUser.firstName} ${conv.otherUser.lastName}`,
                            conv.id,
                          )
                        }
                        style={menuItemStyle('#7c3aed')}
                      >
                        🚫 Engelle
                      </button>
                      <button
                        onClick={() => deleteConversation(conv.id)}
                        style={menuItemStyle('#ef4444')}
                      >
                        🗑️ Sohbeti Sil
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat Area */}
          <div className="messages-chat">
            {!activeConv ? (
              <div className="messages-empty">
                <p>💬</p>
                <p>Bir sohbet seçin</p>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <strong>
                    {activeConv.otherUser.firstName} {activeConv.otherUser.lastName}
                  </strong>
                  <span className="muted">{roleLabel(activeConv.otherUser.role)}</span>
                </div>
                <div className="chat-messages">
                  {loadingMsgs ? (
                    <p className="muted">Yükleniyor...</p>
                  ) : messages.length === 0 ? (
                    <p className="muted">Henüz mesaj yok. İlk mesajı gönderin!</p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`chat-msg ${msg.isOwn ? 'chat-msg-own' : 'chat-msg-other'}`}
                      >
                        <div className="chat-bubble">
                          <span className="chat-text">{msg.content}</span>
                          <span className="chat-time">
                            {new Date(msg.createdAt).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-input-bar" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Mesaj yaz..."
                    disabled={sending}
                    autoFocus
                  />
                  <button type="submit" className="primary" disabled={!text.trim() || sending}>
                    {sending ? '...' : 'Gönder'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setReportTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              border: '1px solid rgba(148,163,184,0.2)',
            }}
          >
            <h3 style={{ margin: 0, color: '#e2e8f0' }}>🚩 Şikayet Et</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
              {reportTarget.userName} hakkında şikayetinizi seçin. 24 saat içinde incelenecektir.
            </p>

            <div style={{ display: 'grid', gap: 8 }}>
              {REPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setReportCategory(cat.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    background:
                      reportCategory === cat.key ? 'rgba(245,158,11,0.12)' : 'rgba(15,23,42,0.4)',
                    border:
                      reportCategory === cat.key
                        ? '1px solid #f59e0b'
                        : '1px solid rgba(148,163,184,0.2)',
                    color: reportCategory === cat.key ? '#f59e0b' : '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: reportCategory === cat.key ? 700 : 500,
                    fontSize: 14,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <span style={{ flex: 1 }}>{cat.label}</span>
                  {reportCategory === cat.key && <span>✓</span>}
                </button>
              ))}
            </div>

            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Açıklama (opsiyonel)"
              rows={3}
              style={{
                width: '100%',
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(148,163,184,0.2)',
                color: '#e2e8f0',
                fontSize: 14,
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setReportTarget(null)}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(148,163,184,0.3)',
                  color: '#94a3b8',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={submitReport}
                disabled={submittingReport}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: submittingReport ? 0.6 : 1,
                }}
              >
                {submittingReport ? 'Gönderiliyor...' : '🚩 Şikayet Gönder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function menuItemStyle(color: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'block',
  };
}
