import { useCallback, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { AdminLayout } from '../components/AdminLayout';

type Appointment = {
  id: string;
  status: string;
  totalAmount: string;
  currency: string;
  paymentStatus: string;
  paymentMethod: string | null;
  notes: string | null;
  adminNote: string | null;
  createdAt: string;
  cancelledAt: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  service: { id: string; name: string; category: string };
  slot: { id: string; date: string; startTime: string; endTime: string };
};

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  no_show: 'Gelinmedi',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  confirmed: '#38bdf8',
  completed: '#10b981',
  cancelled: '#f87171',
  no_show: '#94a3b8',
};

export function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const data = await apiJson<Appointment[]>(`/v2/appointments${query}`);
      setAppointments(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;
    const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    apiJson<Appointment[]>(`/v2/appointments${query}`)
      .then((data) => { if (!cancelled) { setAppointments(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await apiJson(`/v2/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote: adminNoteInput[id] }),
      });
      void load();
    } catch (err) { alert(err instanceof Error ? err.message : 'Güncelleme başarısız'); }
    finally { setUpdating(null); }
  }

  const counts = {
    all: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  return (
    <AdminLayout>
      <div style={{ padding: '1.5rem' }}>
        <h1 style={{ marginBottom: '1.5rem' }}>📅 Randevu Yönetimi</h1>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: `1px solid ${statusFilter === s ? '#38bdf8' : 'rgba(148,163,184,0.2)'}`,
                background: statusFilter === s ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: statusFilter === s ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              {s === 'all' ? 'Tümü' : STATUS_LABELS[s]} ({counts[s]})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="muted">Yükleniyor...</p>
        ) : appointments.length === 0 ? (
          <p className="muted">Bu filtrede randevu yok.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {appointments.map(a => (
              <div key={a.id} style={{ padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(148,163,184,0.12)', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  {/* Sol: Bilgiler */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                        {a.user.firstName} {a.user.lastName}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.user.email}</span>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: `${STATUS_COLORS[a.status]}22`,
                        color: STATUS_COLORS[a.status],
                        border: `1px solid ${STATUS_COLORS[a.status]}44`,
                      }}>
                        {STATUS_LABELS[a.status] || a.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Hizmet</span>
                        <span style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>{a.service.name}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Tarih & Saat</span>
                        <span style={{ color: '#e2e8f0', fontSize: '0.9rem', fontWeight: 600 }}>
                          {new Date(a.slot.date).toLocaleDateString('tr-TR')} · {a.slot.startTime}–{a.slot.endTime}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Tutar</span>
                        <span style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 700 }}>{a.totalAmount}₺</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Ödeme</span>
                        <span style={{ color: a.paymentStatus === 'paid' ? '#10b981' : a.paymentStatus === 'package' ? '#a78bfa' : '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
                          {a.paymentStatus === 'paid' ? '✅ Ödendi'
                            : a.paymentStatus === 'deposit_paid' ? '💳 Kapora ödendi'
                            : a.paymentStatus === 'package' ? '📦 Paketten'
                            : a.paymentStatus === 'pending' ? '⏳ Bekliyor'
                            : a.paymentStatus}
                        </span>
                      </div>
                    </div>
                    {a.notes && <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '0.5rem' }}>📝 {a.notes}</p>}
                    {a.adminNote && <p style={{ color: '#38bdf8', fontSize: '0.82rem', marginTop: '0.25rem' }}>👤 Admin: {a.adminNote}</p>}
                  </div>

                  {/* Sağ: Aksiyonlar */}
                  {a.status !== 'cancelled' && a.status !== 'completed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 200 }}>
                      <input
                        type="text"
                        placeholder="Admin notu (opsiyonel)"
                        value={adminNoteInput[a.id] || ''}
                        onChange={(e) => setAdminNoteInput(prev => ({ ...prev, [a.id]: e.target.value }))}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.82rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {a.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(a.id, 'confirmed')}
                            disabled={updating === a.id}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            ✓ Onayla
                          </button>
                        )}
                        {a.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus(a.id, 'completed')}
                            disabled={updating === a.id}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.2)', color: '#10b981', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            ✓ Tamamla
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(a.id, 'cancelled')}
                          disabled={updating === a.id}
                          style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', background: 'rgba(248,113,113,0.15)', color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          ✕ İptal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
