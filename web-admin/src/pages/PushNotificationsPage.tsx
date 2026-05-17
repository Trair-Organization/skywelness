import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { readStoredTenantSubdomain } from '../auth/storage';

type NotificationLog = {
  id: string;
  title: string;
  message: string;
  target: string;
  sent: number;
  total: number;
  createdAt: string;
};

const TEMPLATES = [
  { title: '🎉 Hoş Geldiniz!', message: 'Kulübümüze katıldığınız için teşekkür ederiz. Size en iyi deneyimi sunmak için buradayız!' },
  { title: '⏰ Randevu Hatırlatma', message: 'Yarınki randevunuzu hatırlatmak isteriz. Görüşmek üzere!' },
  { title: '🔥 Yeni Kampanya', message: 'Size özel bir fırsat var! Detaylar için uygulamaya göz atın.' },
  { title: '📅 Etkinlik Duyurusu', message: 'Yeni bir etkinlik oluşturuldu. Katılmak için hemen kayıt olun!' },
  { title: '💪 Motivasyon', message: 'Harika gidiyorsunuz! Bu haftaki hedefinize ulaşmaya çok yakınsınız.' },
];

export function PushNotificationsPage() {
  const { user } = useAuth();
  const isTrainer = user?.role === 'trainer' || user?.role === 'independent_trainer';
  const isPlatformAdmin = user?.role === 'platform_admin';

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [target, setTarget] = useState<'members' | 'trainers' | 'all'>('all');
  const [platformTarget, setPlatformTarget] = useState<'all' | 'members' | 'trainers' | 'tenant'>('all');
  const [tenantId, setTenantId] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<NotificationLog[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [clubName, setClubName] = useState('Wellness Club');

  // Load club name
  useEffect(() => {
    if (user?.role === 'administrator') {
      apiJson<{ name: string }>('/admin/tenant/profile').then(p => setClubName(p.name)).catch(() => {
        const sub = readStoredTenantSubdomain();
        if (sub) setClubName(sub.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      });
    }
  }, [user]);

  // Load notification history (from announcements as proxy)
  const loadHistory = useCallback(async () => {
    try {
      if (user?.role === 'administrator') {
        const rows = await apiJson<Array<{ id: string; title: string; content: string; target: string; recipientCount: number; createdAt: string }>>('/admin/announcements');
        setHistory(rows.map(r => ({ id: r.id, title: r.title, message: r.content, target: r.target, sent: r.recipientCount, total: r.recipientCount, createdAt: r.createdAt })));
      }
    } catch { /* */ }
  }, [user]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { readStoredToken } = await import('../auth/storage');
      const token = readStoredToken();
      const base = (await import('../lib/config')).apiBaseUrl();
      const res = await fetch(`${base}/auth/upload-image`, {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Upload failed');
      const body = await res.json() as { url?: string };
      if (body.url) {
        const serverBase = base.replace('/api/v1', '');
        setImageUrl(body.url.startsWith('http') ? body.url : `${serverBase}${body.url}`);
      }
    } catch { alert('Görsel yüklenemedi'); }
    finally { setUploading(false); }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { alert('Başlık ve mesaj zorunludur'); return; }
    setSending(true); setResult(null);
    try {
      let endpoint = '/admin/push-notifications/send';
      let body: Record<string, unknown> = { title: title.trim(), message: message.trim(), imageUrl: imageUrl.trim() || undefined, target };

      if (isTrainer) {
        endpoint = '/trainer-panel/push-notifications/send';
        body = { title: title.trim(), message: message.trim(), imageUrl: imageUrl.trim() || undefined };
      } else if (isPlatformAdmin) {
        endpoint = '/platform-admin/push-notifications/send';
        body = { title: title.trim(), message: message.trim(), imageUrl: imageUrl.trim() || undefined, target: platformTarget, tenantId: platformTarget === 'tenant' ? tenantId : undefined };
      }

      const res = await apiJson<{ ok: boolean; sent: number; total: number }>(endpoint, { method: 'POST', body: JSON.stringify(body) });
      setResult({ sent: res.sent, total: res.total });
      // Save to announcements for history
      if (!isTrainer) {
        try {
          await apiJson('/admin/announcements', { method: 'POST', body: JSON.stringify({ title: title.trim(), content: message.trim(), target: isPlatformAdmin ? platformTarget : target, sendPush: false }) });
        } catch { /* ignore */ }
      }
      setTitle(''); setMessage(''); setImageUrl('');
      void loadHistory();
    } catch (e) { alert(`Hata: ${e instanceof Error ? e.message : 'Gönderilemedi'}`); }
    finally { setSending(false); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>🔔 Push Bildirimleri</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            {isTrainer ? 'Öğrencilerinize bildirim gönderin' : isPlatformAdmin ? 'Tüm sisteme bildirim gönderin' : 'Üyelerinize ve ekibinize bildirim gönderin'}
          </p>
        </div>
      </div>

      {result && (
        <div style={{ padding: '14px 18px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 20 }}>
          <p style={{ color: '#059669', fontWeight: 700, margin: 0 }}>✅ Bildirim gönderildi! {result.sent}/{result.total} kişiye ulaştı.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Sol: Gönderim Formu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Şablonlar */}
          <div>
            <button onClick={() => setShowTemplates(!showTemplates)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>📋 Hazır Şablonlar {showTemplates ? '▲' : '▼'}</button>
            {showTemplates && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => { setTitle(t.title); setMessage(t.message); setShowTemplates(false); }} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>
                    <strong>{t.title}</strong><br /><span style={{ color: '#64748b', fontSize: 12 }}>{t.message.slice(0, 50)}...</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Görsel */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🖼️ Görsel (opsiyonel)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {imageUrl && <img src={imageUrl} alt="" style={{ width: 60, height: 45, borderRadius: 6, objectFit: 'cover' }} />}
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadImage(f); }} style={{ fontSize: 13 }} disabled={uploading} />
            </div>
          </div>

          {/* Başlık */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>📌 Başlık *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Bildirim başlığı..." style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14 }} />
          </div>

          {/* Mesaj */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>💬 Mesaj *</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={500} placeholder="Bildirim detayını yazın..." style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 14, resize: 'vertical' }} />
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{message.length}/500</p>
          </div>

          {/* Hedef Kitle */}
          {!isTrainer && !isPlatformAdmin && (
            <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🎯 Hedef Kitle</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'members', 'trainers'] as const).map(t => (
                  <button key={t} onClick={() => setTarget(t)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid', borderColor: target === t ? '#2563eb' : '#e2e8f0', background: target === t ? '#eff6ff' : '#ffffff', color: target === t ? '#2563eb' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    {t === 'all' ? '👥 Herkes' : t === 'members' ? '🏠 Üyeler' : '🏋️ Personel'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isPlatformAdmin && (
            <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>🎯 Hedef</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['all', 'members', 'trainers', 'tenant'] as const).map(t => (
                  <button key={t} onClick={() => setPlatformTarget(t)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid', borderColor: platformTarget === t ? '#2563eb' : '#e2e8f0', background: platformTarget === t ? '#eff6ff' : '#ffffff', color: platformTarget === t ? '#2563eb' : '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                    {t === 'all' ? '🌐 Tümü' : t === 'members' ? '🏠 Üyeler' : t === 'trainers' ? '🏋️ Eğitmenler' : '🏢 Kulüp'}
                  </button>
                ))}
              </div>
              {platformTarget === 'tenant' && <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Tenant ID" style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 13 }} />}
            </div>
          )}

          {/* Gönder */}
          <button onClick={() => void handleSend()} disabled={sending || !title.trim() || !message.trim()} style={{ width: '100%', padding: '14px', borderRadius: 12, background: (sending || !title.trim() || !message.trim()) ? '#e2e8f0' : '#2563eb', color: (sending || !title.trim() || !message.trim()) ? '#94a3b8' : '#fff', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: sending ? 'not-allowed' : 'pointer' }}>
            {sending ? '⏳ Gönderiliyor...' : '🚀 Bildirimi Gönder'}
          </button>
        </div>

        {/* Sağ: Önizleme + Geçmiş */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mobil Önizleme */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 12 }}>📱 Mobil Önizleme</label>
            <div style={{ background: '#1e293b', borderRadius: 16, padding: '12px 16px', maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{clubName} • şimdi</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{title || 'Bildirim Başlığı'}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>{message || 'Bildirim mesajı burada görünecek...'}</p>
              {imageUrl && <img src={imageUrl} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
            </div>
          </div>

          {/* Gönderim Geçmişi */}
          <div style={{ padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 12 }}>📜 Son Gönderimler</label>
            {history.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: 13 }}>Henüz bildirim gönderilmemiş.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {history.slice(0, 10).map(h => (
                  <div key={h.id} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{h.title}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(h.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{h.message.slice(0, 60)}</p>
                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>📤 {h.sent} kişiye</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
