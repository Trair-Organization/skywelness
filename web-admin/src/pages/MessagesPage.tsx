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
  unreadCount: number;
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

function roleLabel(role: string) {
  switch (role) {
    case 'member':
      return '👤 Üye';
    case 'trainer':
      return '🏋️ Eğitmen';
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
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await apiJson<ConversationRow[]>('/messages/conversations');
      setConversations(rows);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      queueMicrotask(() => {
        void loadConversations();
      });
    }
  }, [token, loadConversations]);

  // Poll conversations
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
      /* ignore */
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const openConversation = (conv: ConversationRow) => {
    setActiveConv(conv);
    void loadMessages(conv.id);
  };

  // Poll active conversation
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

  return (
    <div className="shell">
      <h1>💬 Mesajlar</h1>
      <div className="messages-layout">
        {/* Conversation List */}
        <div className="messages-sidebar">
          {loading ? (
            <p className="muted">Yükleniyor...</p>
          ) : conversations.length === 0 ? (
            <p className="muted">Henüz mesajınız yok.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`conv-row ${activeConv?.id === conv.id ? 'conv-row-active' : ''}`}
                onClick={() => openConversation(conv)}
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
                      {conv.lastMessagePreview}
                    </span>
                  )}
                </div>
                {conv.unreadCount > 0 && <span className="conv-badge">{conv.unreadCount}</span>}
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
    </div>
  );
}
