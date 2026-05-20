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
  tags: string[];
};

type BlockedUserRow = {
  id: string;
  blockedAt: string;
  reason: string | null;
  user: { id: string; firstName: string; lastName: string; photoUrl: string | null; role: string } | null;
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

type DuyuruLog = { date: string; text: string; recipientCount: number };

type Channel = 'members' | 'staff' | 'announcements' | 'archived' | 'blocked';

function roleLabel(role: string) {
  switch (role) {
    case 'member': return '👤 Üye';
    case 'trainer': case 'independent_trainer': return '🏋️ Eğitmen';
    case 'administrator': return '🏢 Admin';
    default: return role;
  }
}

function timeAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Şimdi';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}dk`;
  if (diff < 86400000) return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

const QUICK_REPLIES = [
  'Hoş geldiniz! Size nasıl yardımcı olabilirim?',
  'Bilgi için teşekkür ederim.',
  'Randevunuz onaylanmıştır. İyi günler!',
  'Paketiniz aktifleştirildi. Keyifli antrenmanlar!',
  'Detaylı bilgi için lütfen kulübümüzü ziyaret edin.',
];

const TRAINER_QUICK_REPLIES = [
  'Merhaba! Size nasıl yardımcı olabilirim?',
  'Yarınki dersinizi unutmayın, görüşmek üzere!',
  'Bugün harika bir antrenman yaptık, tebrikler!',
  'Bu haftaki ödevini hatırlatmak istedim.',
  'Lütfen su ve havlu yanınızda olsun.',
  'Ders saatimde küçük bir değişiklik var, ajandadan kontrol edebilir misin?',
  'Beslenme planını uyguluyor musun? Sorun olursa söyle.',
];

export function MessagesPage() {
  const { token, user } = useAuth();
  const isTrainer = user?.role === 'trainer' || user?.role === 'independent_trainer';
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [archivedConvs, setArchivedConvs] = useState<ConversationRow[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<Channel>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [announcements, setAnnouncements] = useState<DuyuruLog[]>([]);
  const [selectedConvs, setSelectedConvs] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // New conv modal
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvTab, setNewConvTab] = useState<'members' | 'staff'>('members');
  const [newConvSearch, setNewConvSearch] = useState('');
  const [newConvResults, setNewConvResults] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; publicId?: string | null; role: string }>>([]);

  // Bulk message
  const [showBulkMsg, setShowBulkMsg] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkMembers, setBulkMembers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; publicId?: string | null; role?: string }>>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkFilter, setBulkFilter] = useState('');
  const [bulkTab, setBulkTab] = useState<'members' | 'staff'>('members');

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const rows = await apiJson<ConversationRow[]>('/messages/conversations');
      setConversations(rows);
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  const loadBlocked = useCallback(async () => {
    try { setBlockedUsers(await apiJson<BlockedUserRow[]>('/messages/users/blocked')); } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadConversations();
    void loadBlocked();
  }, [token, loadConversations, loadBlocked]);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => { void loadConversations(); }, 8000);
    return () => clearInterval(id);
  }, [token, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      setMessages(await apiJson<MessageRow[]>(`/messages/conversations/${convId}?limit=100`));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* */ }
    finally { setLoadingMsgs(false); }
  }, []);

  const openConversation = (conv: ConversationRow) => { setActiveConv(conv); void loadMessages(conv.id); };

  useEffect(() => {
    if (!activeConv) return;
    const id = setInterval(() => { void loadMessages(activeConv.id); }, 5000);
    return () => clearInterval(id);
  }, [activeConv, loadMessages]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConv || sending) return;
    setSending(true);
    const content = text.trim(); setText('');
    try { await apiJson(`/messages/conversations/${activeConv.id}`, { method: 'POST', body: JSON.stringify({ content }) }); await loadMessages(activeConv.id); await loadConversations(); }
    catch { setText(content); }
    finally { setSending(false); }
  };

  // Bulk delete
  const bulkDeleteConvs = async () => {
    if (selectedConvs.size === 0) return;
    if (!confirm(`${selectedConvs.size} sohbeti silmek istediğinize emin misiniz?`)) return;
    for (const convId of selectedConvs) {
      try { await apiJson(`/messages/conversations/${convId}`, { method: 'DELETE' }); } catch { /* */ }
    }
    setConversations(prev => prev.filter(c => !selectedConvs.has(c.id)));
    if (activeConv && selectedConvs.has(activeConv.id)) setActiveConv(null);
    setSelectedConvs(new Set());
    await loadConversations();
  };

  const archiveConv = (convId: string) => {
    const conv = conversations.find(c => c.id === convId);
    if (conv) { setArchivedConvs(prev => [conv, ...prev]); setConversations(prev => prev.filter(c => c.id !== convId)); if (activeConv?.id === convId) setActiveConv(null); }
    setMenuOpenId(null);
  };

  const unarchiveConv = (convId: string) => {
    const conv = archivedConvs.find(c => c.id === convId);
    if (conv) { setConversations(prev => [conv, ...prev]); setArchivedConvs(prev => prev.filter(c => c.id !== convId)); }
  };

  const deleteConv = async (convId: string) => {
    if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return;
    try {
      await apiJson(`/messages/conversations/${convId}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConv?.id === convId) setActiveConv(null);
    } catch (e) {
      alert('Silinemedi: ' + (e instanceof Error ? e.message : String(e)));
    }
    setMenuOpenId(null);
  };

  const blockUser = async (userId: string, convId: string) => {
    if (!confirm('Engellemek istediğinize emin misiniz?')) return;
    try { await apiJson(`/messages/users/${userId}/block`, { method: 'POST', body: JSON.stringify({}) }); setConversations(prev => prev.filter(c => c.id !== convId)); if (activeConv?.id === convId) setActiveConv(null); await loadBlocked(); } catch { alert('Engelleme başarısız'); }
    setMenuOpenId(null);
  };

  const unblockUser = async (userId: string) => {
    try { await apiJson(`/messages/users/${userId}/block`, { method: 'DELETE' }); setBlockedUsers(prev => prev.filter(b => b.user?.id !== userId)); } catch { alert('Engel kaldırılamadı'); }
  };

  // New conversation
  const searchNewConv = async (q: string, tab: 'members' | 'staff') => {
    try {
      const endpoint = tab === 'staff' ? '/admin/trainers' : `/admin/members?search=${encodeURIComponent(q)}`;
      const res = await apiJson<Array<{ id: string; userId?: string; firstName: string; lastName: string; email: string; publicId?: string | null; role?: string }>>(endpoint);
      const mapped = (tab === 'staff' ? res.map(t => ({ ...t, id: t.userId || t.id, role: 'trainer' })) : res).slice(0, 8);
      setNewConvResults(mapped.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, publicId: u.publicId, role: u.role || 'member' })));
    } catch { setNewConvResults([]); }
  };

  const startNewConv = async (otherUserId: string) => {
    try {
      const conv = await apiJson<{ conversationId?: string; id?: string }>('/messages/conversations', { method: 'POST', body: JSON.stringify({ otherUserId }) });
      const convId = conv.conversationId || conv.id;
      setShowNewConv(false); setNewConvSearch(''); setNewConvResults([]);
      await loadConversations();
      const updated = await apiJson<ConversationRow[]>('/messages/conversations');
      const found = updated.find(c => c.id === convId);
      if (found) openConversation(found);
    } catch { alert('Sohbet başlatılamadı'); }
  };

  // Bulk message
  const loadBulkMembers = async () => {
    try {
      const [members, trainers] = await Promise.all([
        apiJson<Array<{ id: string; userId?: string; firstName: string; lastName: string; email: string; publicId?: string | null }>>('/admin/members?status=active'),
        apiJson<Array<{ id: string; userId?: string; firstName: string; lastName: string; email: string; publicId?: string | null }>>('/admin/trainers'),
      ]);
      const allMembers = members.map(m => ({ ...m, role: 'member' }));
      const allStaff = trainers.map(t => ({ ...t, id: t.userId || t.id, role: 'trainer' }));
      setBulkMembers([...allMembers, ...allStaff]);
    } catch { /* */ }
  };

  const sendBulkMessage = async () => {
    if (bulkSelected.size === 0) { showToast('⚠️ Lütfen en az bir kişi seçin.', 'warning'); return; }
    if (!bulkText.trim()) { showToast('⚠️ Lütfen mesaj alanına mesaj yazın.', 'warning'); return; }
    setBulkSending(true);
    let sent = 0;
    const errors: string[] = [];
    for (const memberId of bulkSelected) {
      try {
        const conv = await apiJson<{ conversationId?: string; id?: string }>('/messages/conversations', { method: 'POST', body: JSON.stringify({ otherUserId: memberId }) });
        const convId = conv.conversationId || conv.id;
        if (!convId) { errors.push(memberId + ': no conversation id'); continue; }
        await apiJson(`/messages/conversations/${convId}`, { method: 'POST', body: JSON.stringify({ content: bulkText.trim() }) });
        sent++;
      } catch (e) {
        errors.push(memberId + ': ' + (e instanceof Error ? e.message : 'hata'));
      }
    }
    if (errors.length > 0) {
      showToast(`✅ ${sent} kişiye gönderildi, ${errors.length} başarısız`, sent > 0 ? 'success' : 'error');
    } else {
      showToast(`✅ ${sent} kişiye mesaj başarıyla gönderildi!`, 'success');
    }
    setAnnouncements(prev => [{ date: new Date().toISOString(), text: bulkText.trim(), recipientCount: sent }, ...prev]);
    setShowBulkMsg(false); setBulkText(''); setBulkSelected(new Set()); await loadConversations();
    setBulkSending(false);
  };

  // ─── Filtered Conversations ─────────────────────────────────────────────────

  const memberConvs = conversations.filter(c => c.otherUser.role === 'member').filter(c => !searchQuery || `${c.otherUser.firstName} ${c.otherUser.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const staffConvs = conversations.filter(c => c.otherUser.role === 'trainer' || c.otherUser.role === 'independent_trainer' || c.otherUser.role === 'administrator').filter(c => !searchQuery || `${c.otherUser.firstName} ${c.otherUser.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const memberUnread = memberConvs.reduce((s, c) => s + c.unreadCount, 0);
  const staffUnread = staffConvs.reduce((s, c) => s + c.unreadCount, 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  const channels: Array<{ key: Channel; icon: string; label: string; badge?: number }> = [
    {
      key: 'members',
      icon: isTrainer ? '🎓' : '👥',
      label: isTrainer ? 'Öğrenciler' : 'Üyeler',
      badge: memberUnread || undefined,
    },
    {
      key: 'staff',
      icon: '🏢',
      label: isTrainer ? 'Kulüp & Diğer' : 'Personel',
      badge: staffUnread || undefined,
    },
    { key: 'announcements', icon: '📢', label: 'Duyurular' },
    { key: 'archived', icon: '📦', label: 'Arşiv' },
    { key: 'blocked', icon: '🚫', label: 'Engellenenler' },
  ];

  const currentList = channel === 'members' ? memberConvs : channel === 'staff' ? staffConvs : [];

  return (
    <div onClick={() => setMenuOpenId(null)}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '14px 20px', borderRadius: 12,
          background: toast.type === 'success' ? '#059669' : toast.type === 'warning' ? '#d97706' : '#dc2626',
          color: '#ffffff', fontWeight: 600, fontSize: 14,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'slideIn 0.3s ease',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.message}
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', marginLeft: 8 }}>✕</button>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>💬 Mesajlar</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowNewConv(true); void searchNewConv('', newConvTab); }} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Yeni Sohbet</button>
          <button onClick={() => { setShowBulkMsg(true); void loadBulkMembers(); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📢 Toplu Mesaj</button>
        </div>
      </div>

      {/* Channel Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {channels.map(ch => (
          <button key={ch.key} onClick={() => { setChannel(ch.key); setActiveConv(null); }} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid', borderColor: channel === ch.key ? '#2563eb' : '#e2e8f0', background: channel === ch.key ? '#eff6ff' : '#ffffff', color: channel === ch.key ? '#2563eb' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer', position: 'relative' }}>
            {ch.icon} {ch.label}
            {ch.badge && ch.badge > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ch.badge}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      {(channel === 'members' || channel === 'staff') && (
        <input type="text" placeholder="🔍 Sohbetlerde ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, marginBottom: 12 }} />
      )}

      {/* Announcements Channel */}
      {channel === 'announcements' && (
        <AnnouncementsChannel announcements={announcements} setAnnouncements={setAnnouncements} />
      )}

      {/* Archived Channel */}
      {channel === 'archived' && (
        <div>
          {archivedConvs.length === 0 ? <p style={{ color: '#64748b', fontSize: 14 }}>📦 Arşivde sohbet yok.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {archivedConvs.map(conv => (
                <div key={conv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#2563eb' }}>{conv.otherUser.firstName[0]}{conv.otherUser.lastName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{conv.otherUser.firstName} {conv.otherUser.lastName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{conv.lastMessagePreview || '—'}</div>
                  </div>
                  <button onClick={() => unarchiveConv(conv.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Arşivden Çıkar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Blocked Channel */}
      {channel === 'blocked' && (
        <div>
          {blockedUsers.length === 0 ? <p style={{ color: '#64748b', fontSize: 14 }}>🚫 Engellenen kullanıcı yok.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedUsers.map(b => b.user && (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#dc2626' }}>{b.user.firstName[0]}{b.user.lastName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.user.firstName} {b.user.lastName}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{roleLabel(b.user.role)} · {timeAgo(b.blockedAt)}</div>
                  </div>
                  <button onClick={() => void unblockUser(b.user!.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#ffffff', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Engeli Kaldır</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members / Staff Chat */}
      {(channel === 'members' || channel === 'staff') && (
        <div className="messages-layout">
          {/* Sidebar */}
          <div className="messages-sidebar">
            {/* Bulk action bar */}
            {selectedConvs.size > 0 && (
              <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb' }}>{selectedConvs.size} seçili</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => void bulkDeleteConvs()} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>🗑️ Sil</button>
                  <button onClick={() => setSelectedConvs(new Set())} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>İptal</button>
                </div>
              </div>
            )}
            {loading ? <p style={{ color: '#64748b' }}>Yükleniyor...</p> : currentList.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                {channel === 'staff'
                  ? isTrainer
                    ? 'Kulüp ile sohbet yok.'
                    : 'Personel ile sohbet yok.'
                  : isTrainer
                    ? 'Henüz öğrenci sohbeti yok.'
                    : 'Üye ile sohbet yok.'}
              </p>
            ) : currentList.map(conv => (
              <div key={conv.id} className={`conv-row ${activeConv?.id === conv.id ? 'conv-row-active' : ''}`} onClick={() => openConversation(conv)} style={{ position: 'relative' }}>
                <input type="checkbox" checked={selectedConvs.has(conv.id)} onChange={(e) => { e.stopPropagation(); const n = new Set(selectedConvs); if (n.has(conv.id)) n.delete(conv.id); else n.add(conv.id); setSelectedConvs(n); }} onClick={(e) => e.stopPropagation()} style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                <div className="conv-avatar">{conv.otherUser.firstName[0]}{conv.otherUser.lastName[0]}</div>
                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">{conv.otherUser.firstName} {conv.otherUser.lastName}</span>
                    <span className="conv-time">{timeAgo(conv.lastMessageAt)}</span>
                  </div>
                  <span className="conv-role">{roleLabel(conv.otherUser.role)}</span>
                  {conv.tags && conv.tags.length > 0 && <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>{conv.tags.map((tag, i) => <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>{tag}</span>)}</div>}
                  {conv.lastMessagePreview && <span className={`conv-preview ${conv.unreadCount > 0 ? 'conv-preview-unread' : ''}`}>{conv.isLastMessageMine ? '📤 ' : ''}{conv.lastMessagePreview}</span>}
                </div>
                {conv.unreadCount > 0 && <span className="conv-badge">{conv.unreadCount}</span>}
                <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === conv.id ? null : conv.id); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>⋯</button>
                {menuOpenId === conv.id && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 8, top: '100%', zIndex: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160 }}>
                    <button onClick={() => { const tag = prompt('Etiket ekle (örn: VIP, Yeni, İlgili):'); if (tag?.trim()) { const newTags = [...(conv.tags || []), tag.trim()].slice(0, 5); void apiJson(`/messages/conversations/${conv.id}/tags`, { method: 'POST', body: JSON.stringify({ tags: newTags }) }).then(() => void loadConversations()); } setMenuOpenId(null); }} style={menuStyle}>🏷️ Etiket Ekle</button>
                    {(conv.tags || []).length > 0 && <button onClick={() => { void apiJson(`/messages/conversations/${conv.id}/tags`, { method: 'POST', body: JSON.stringify({ tags: [] }) }).then(() => void loadConversations()); setMenuOpenId(null); }} style={menuStyle}>🗑️ Etiketleri Temizle</button>}
                    <button onClick={() => archiveConv(conv.id)} style={menuStyle}>📦 Arşivle</button>
                    <button onClick={() => void blockUser(conv.otherUser.id, conv.id)} style={menuStyle}>🚫 Engelle</button>
                    <button onClick={() => void deleteConv(conv.id)} style={{ ...menuStyle, color: '#dc2626' }}>🗑️ Sil</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Area */}
          <div className="messages-chat">
            {!activeConv ? (
              <div className="messages-empty"><p>💬</p><p>Bir sohbet seçin</p></div>
            ) : (
              <>
                <div className="chat-header">
                  <strong>{activeConv.otherUser.firstName} {activeConv.otherUser.lastName}</strong>
                  <span className="muted">{roleLabel(activeConv.otherUser.role)}</span>
                </div>
                <div className="chat-messages">
                  {loadingMsgs ? <p className="muted">Yükleniyor...</p> : messages.length === 0 ? <p className="muted">Henüz mesaj yok.</p> : messages.map(msg => (
                    <div key={msg.id} className={`chat-msg ${msg.isOwn ? 'chat-msg-own' : 'chat-msg-other'}`}>
                      <div className="chat-bubble">
                        <span className="chat-text">{msg.content}</span>
                        <span className="chat-time">{new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}{msg.isOwn && <span style={{ marginLeft: 4 }}>{msg.isRead ? '✓✓' : '✓'}</span>}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-input-bar" onSubmit={sendMessage}>
                  <button type="button" onClick={() => setShowQuickReplies(!showQuickReplies)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 8px', color: '#64748b' }} title="Hazır Yanıtlar">⚡</button>
                  <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Mesaj yaz..." disabled={sending} autoFocus />
                  <button type="submit" className="primary" disabled={!text.trim() || sending}>{sending ? '...' : 'Gönder'}</button>
                </form>
                {showQuickReplies && (
                  <div style={{ padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid #e2e8f0' }}>
                    {(isTrainer ? TRAINER_QUICK_REPLIES : QUICK_REPLIES).map((qr, i) => (
                      <button key={i} onClick={() => { setText(qr); setShowQuickReplies(false); }} style={{ padding: '5px 10px', borderRadius: 16, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>{qr.slice(0, 30)}...</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewConv(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 440, width: '100%', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h3 style={{ margin: '0 0 12px', color: '#0f172a' }}>+ Yeni Sohbet</h3>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button onClick={() => { setNewConvTab('members'); void searchNewConv(newConvSearch, 'members'); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: newConvTab === 'members' ? '#2563eb' : '#e2e8f0', background: newConvTab === 'members' ? '#eff6ff' : '#ffffff', color: newConvTab === 'members' ? '#2563eb' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>👥 Üyeler</button>
              <button onClick={() => { setNewConvTab('staff'); void searchNewConv('', 'staff'); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: newConvTab === 'staff' ? '#2563eb' : '#e2e8f0', background: newConvTab === 'staff' ? '#eff6ff' : '#ffffff', color: newConvTab === 'staff' ? '#2563eb' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🏋️ Personel</button>
            </div>
            <input type="text" placeholder="İsim ile ara..." value={newConvSearch} onChange={(e) => { setNewConvSearch(e.target.value); void searchNewConv(e.target.value, newConvTab); }} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} />
            <div style={{ maxHeight: 280, overflowY: 'auto', marginTop: 8 }}>
              {newConvResults.length === 0 ? <p style={{ color: '#64748b', fontSize: 13, padding: 12, textAlign: 'center' }}>Kişi bulunamadı</p> : newConvResults.map(u => (
                <div key={u.id} onClick={() => void startNewConv(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#2563eb' }}>{u.firstName[0]}{u.lastName[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.publicId && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '1px 5px', borderRadius: 3 }}>{u.publicId}</span>}
                      <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 14 }}>{u.firstName} {u.lastName}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 12 }}>{u.email} · {roleLabel(u.role)}</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>→</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Message Modal */}
      {showBulkMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowBulkMsg(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 520, width: '100%', border: '1px solid #e2e8f0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>📢 Toplu Mesaj</h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 12px' }}>{bulkSelected.size} kişi seçili</p>
            
            {/* Tabs: Üyeler / Personel */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button onClick={() => setBulkTab('members')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: bulkTab === 'members' ? '#2563eb' : '#e2e8f0', background: bulkTab === 'members' ? '#eff6ff' : '#ffffff', color: bulkTab === 'members' ? '#2563eb' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>👥 Üyeler ({bulkMembers.filter(m => m.role === 'member').length})</button>
              <button onClick={() => setBulkTab('staff')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: bulkTab === 'staff' ? '#2563eb' : '#e2e8f0', background: bulkTab === 'staff' ? '#eff6ff' : '#ffffff', color: bulkTab === 'staff' ? '#2563eb' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🏋️ Personel ({bulkMembers.filter(m => m.role === 'trainer').length})</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input type="text" placeholder="Ara..." value={bulkFilter} onChange={(e) => setBulkFilter(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 13 }} />
              <button onClick={() => { const filtered = bulkMembers.filter(m => m.role === (bulkTab === 'staff' ? 'trainer' : 'member')).filter(m => !bulkFilter || `${m.firstName} ${m.lastName}`.toLowerCase().includes(bulkFilter.toLowerCase())); const allSelected = filtered.every(m => bulkSelected.has(m.id)); const next = new Set(bulkSelected); filtered.forEach(m => allSelected ? next.delete(m.id) : next.add(m.id)); setBulkSelected(next); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>Tümünü Seç</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 220, border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 12 }}>
              {bulkMembers
                .filter(m => m.role === (bulkTab === 'staff' ? 'trainer' : 'member'))
                .filter(m => !bulkFilter || `${m.firstName} ${m.lastName}`.toLowerCase().includes(bulkFilter.toLowerCase()))
                .map(m => (
                <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                  <input type="checkbox" checked={bulkSelected.has(m.id)} onChange={() => { const n = new Set(bulkSelected); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); setBulkSelected(n); }} style={{ width: 16, height: 16 }} />
                  {m.publicId && <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#2563eb', fontWeight: 700, background: '#eff6ff', padding: '1px 4px', borderRadius: 3 }}>{m.publicId}</span>}
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{m.firstName} {m.lastName}</span>
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{m.role === 'trainer' ? '🏋️' : '👤'}</span>
                </label>
              ))}
              {bulkMembers.filter(m => m.role === (bulkTab === 'staff' ? 'trainer' : 'member')).length === 0 && <p style={{ padding: 16, color: '#64748b', fontSize: 13, textAlign: 'center' }}>Yükleniyor...</p>}
            </div>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Mesajınızı yazın..." rows={3} style={{ width: '100%', padding: 12, borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 14, resize: 'vertical', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowBulkMsg(false); setBulkSelected(new Set()); }} style={{ flex: 1, padding: 12, borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Vazgeç</button>
              <button onClick={() => void sendBulkMessage()} disabled={bulkSending} style={{ flex: 1, padding: 12, borderRadius: 10, background: bulkSelected.size === 0 ? '#e2e8f0' : '#2563eb', border: 'none', color: bulkSelected.size === 0 ? '#94a3b8' : '#fff', fontWeight: 700, cursor: bulkSending ? 'not-allowed' : 'pointer' }}>{bulkSending ? '⏳...' : `📩 ${bulkSelected.size} Kişiye Gönder`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const menuStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: 'none', background: '#ffffff', color: '#374151', fontSize: 13, fontWeight: 600, textAlign: 'left', cursor: 'pointer', display: 'block' };

// ─── Announcements Component ──────────────────────────────────────────────────

type AnnouncementRow = { id: string; title: string; content: string; target: string; recipientCount: number; readCount: number; createdAt: string };

function AnnouncementsChannel({ setAnnouncements }: { announcements: DuyuruLog[]; setAnnouncements: React.Dispatch<React.SetStateAction<DuyuruLog[]>> }) {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try { setRows(await apiJson<AnnouncementRow[]>('/admin/announcements')); } catch { /* */ }
      setLoading(false);
    })();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await apiJson<AnnouncementRow>('/admin/announcements', { method: 'POST', body: JSON.stringify({ title: title.trim(), content: content.trim(), target, sendPush: true }) });
      setRows(prev => [res, ...prev]);
      setAnnouncements(prev => [{ date: res.createdAt, text: res.content, recipientCount: res.recipientCount }, ...prev]);
      setShowCreate(false); setTitle(''); setContent(''); setTarget('all');
    } catch { alert('Duyuru oluşturulamadı'); }
    setSaving(false);
  };

  const targetLabel = (t: string) => t === 'members' ? '👥 Üyeler' : t === 'staff' ? '🏋️ Personel' : '👥 Tüm Kulüp';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{rows.length} duyuru</p>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Yeni Duyuru</button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff', marginBottom: 16 }}>
          <input placeholder="Başlık *" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, marginBottom: 8 }} />
          <textarea placeholder="İçerik *" value={content} onChange={(e) => setContent(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, resize: 'vertical', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Hedef:</span>
            {['all', 'members', 'staff'].map(t => (
              <button key={t} onClick={() => setTarget(t)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid', borderColor: target === t ? '#2563eb' : '#e2e8f0', background: target === t ? '#eff6ff' : '#ffffff', color: target === t ? '#2563eb' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t === 'all' ? 'Tümü' : t === 'members' ? 'Üyeler' : 'Personel'}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowCreate(false)} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Vazgeç</button>
            <button onClick={() => void handleCreate()} disabled={saving || !title.trim() || !content.trim()} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? '⏳...' : '📢 Yayınla'}</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? <p style={{ color: '#64748b' }}>Yükleniyor...</p> : rows.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: 14 }}>📢 Henüz duyuru yok. Üyelerinize ve personelinize duyuru gönderin.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(a => (
            <div key={a.id} style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{a.title}</h4>
                <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(a.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>{a.content}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
                <span>{targetLabel(a.target)}</span>
                <span>📤 {a.recipientCount} kişiye</span>
                <span>👁️ {a.readCount} okudu</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>{a.recipientCount > 0 ? Math.round((a.readCount / a.recipientCount) * 100) : 0}% okunma</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
