import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

type EventRow = { id: string; title: string; startsAt: string };

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
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [uploading, setUploading] = useState(false);

  // Etkinlikleri yükle (kulüp admin için)
  useEffect(() => {
    if (isTrainer || isPlatformAdmin) return;
    apiJson<EventRow[]>('/admin/activity')
      .then(() => {})
      .catch(() => {});
    // Etkinlikleri ayrı endpoint'ten çek
    apiJson<EventRow[]>('/resource-booking/admin/bookings')
      .then(() => {})
      .catch(() => {});
  }, [isTrainer, isPlatformAdmin]);

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiJson<{ url: string }>('/auth/upload-image', {
        method: 'POST',
        body: formData,
        headers: undefined,
      });
      setImageUrl(`https://www.wellnessclub.tech${res.url}`);
    } catch {
      alert('Görsel yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      alert('Başlık ve mesaj zorunludur');
      return;
    }
    setSending(true);
    setResult(null);
    try {
      let endpoint = '/admin/push-notifications/send';
      let body: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        imageUrl: imageUrl.trim() || undefined,
        target,
        eventId: selectedEvent || undefined,
      };

      if (isTrainer) {
        endpoint = '/trainer-panel/push-notifications/send';
        body = {
          title: title.trim(),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
        };
      } else if (isPlatformAdmin) {
        endpoint = '/platform-admin/push-notifications/send';
        body = {
          title: title.trim(),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
          target: platformTarget,
          tenantId: platformTarget === 'tenant' ? tenantId : undefined,
        };
      }

      const res = await apiJson<{ ok: boolean; sent: number; total: number }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResult({ sent: res.sent, total: res.total });
      setTitle('');
      setMessage('');
      setImageUrl('');
      setSelectedEvent('');
    } catch (e) {
      alert(`Hata: ${e instanceof Error ? e.message : 'Gönderilemedi'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🔔 Push Bildirimleri</h1>
          <p className="muted">
            {isTrainer
              ? 'Öğrencilerinize bildirim gönderin'
              : isPlatformAdmin
                ? 'Tüm sisteme bildirim gönderin'
                : 'Üyelerinize ve ekibinize bildirim gönderin'}
          </p>
        </div>
      </div>

      {result && (
        <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', marginBottom: '1.5rem' }}>
          <p style={{ color: '#22c55e', fontWeight: 700, margin: 0 }}>
            ✅ Bildirim gönderildi! {result.sent}/{result.total} kişiye ulaştı.
          </p>
        </div>
      )}

      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Görsel */}
        <div className="form-card">
          <label className="form-label">🖼️ Bildirim Görseli (opsiyonel)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {imageUrl && <img src={imageUrl} alt="Preview" style={{ width: 80, height: 60, borderRadius: 8, objectFit: 'cover' }} />}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadImage(f); }}
              style={{ fontSize: '0.85rem', color: '#94a3b8' }}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Başlık */}
        <div className="form-card">
          <label className="form-label">📌 Bildirim Başlığı</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '1rem' }}
            placeholder="Örn: Yeni Etkinlik! 🎉"
          />
        </div>

        {/* Mesaj */}
        <div className="form-card">
          <label className="form-label">💬 Bildirim Açıklaması</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.9rem', resize: 'vertical' }}
            placeholder="Bildirim detayını yazın..."
          />
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', textAlign: 'right' }}>{message.length}/500</p>
        </div>

        {/* Hedef Kitle — Kulüp Admin */}
        {!isTrainer && !isPlatformAdmin && (
          <div className="form-card">
            <label className="form-label">🎯 Hedef Kitle</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['all', 'members', 'trainers'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  style={{
                    flex: 1,
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: target === t ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(148,163,184,0.2)',
                    background: target === t ? 'rgba(56,189,248,0.1)' : 'transparent',
                    color: target === t ? '#38bdf8' : '#94a3b8',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {t === 'all' ? '👥 Herkes' : t === 'members' ? '🏠 Üyeler' : '🏋️ Eğitmenler'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hedef Kitle — Platform Admin */}
        {isPlatformAdmin && (
          <div className="form-card">
            <label className="form-label">🎯 Hedef Kitle</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['all', 'members', 'trainers', 'tenant'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setPlatformTarget(t)}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: platformTarget === t ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(148,163,184,0.2)',
                    background: platformTarget === t ? 'rgba(56,189,248,0.1)' : 'transparent',
                    color: platformTarget === t ? '#38bdf8' : '#94a3b8',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {t === 'all' ? '🌐 Tüm Sistem' : t === 'members' ? '🏠 Üyeler' : t === 'trainers' ? '🏋️ Eğitmenler' : '🏢 Kulüp'}
                </button>
              ))}
            </div>
            {platformTarget === 'tenant' && (
              <input
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Tenant ID girin"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}
              />
            )}
          </div>
        )}

        {/* Gönder */}
        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: '12px',
            background: sending ? 'rgba(56,189,248,0.3)' : '#38bdf8',
            color: '#fff',
            fontWeight: 800,
            fontSize: '1rem',
            border: 'none',
            cursor: sending ? 'default' : 'pointer',
          }}
        >
          {sending ? '⏳ Gönderiliyor...' : '🚀 Bildirimi Gönder'}
        </button>
      </div>
    </div>
  );
}
