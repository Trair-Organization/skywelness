import { useCallback, useEffect, useState } from 'react';
import { apiJson, ApiError } from '../lib/api';
import { TrainersManagementPage } from './TrainersManagementPage';
import { PtAgendaTab } from './PtAgendaTab';

type TabType = 'agenda' | 'reservations' | 'trainers' | 'packages' | 'reports';

export function PtManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('agenda');

  const tabs: { key: TabType; icon: string; label: string }[] = [
    { key: 'agenda', icon: '📅', label: 'Ajanda' },
    { key: 'reservations', icon: '📋', label: 'Randevu Yönetimi' },
    { key: 'trainers', icon: '🏋️', label: 'Eğitmenler' },
    { key: 'packages', icon: '📦', label: 'PT Paketleri' },
    { key: 'reports', icon: '📊', label: 'Raporlar' },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">🏋️ PT Yönetimi</h1>
          <p className="dashboard-subtitle">Eğitmenler, randevular ve PT paketleri — tek panelden yönetin</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-tabs">
          {tabs.map((t) => (
            <button key={t.key} className={`filter-tab ${activeTab === t.key ? 'filter-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'agenda' && <PtAgendaTab />}
      {activeTab === 'reservations' && <PtReservationsTab />}
      {activeTab === 'trainers' && <TrainersManagementPage embedded />}
      {activeTab === 'packages' && <PtPackagesTab />}
      {activeTab === 'reports' && <PtReportsTab />}
    </div>
  );
}


// ─── PT Agenda Tab ──────────────────────────────────────────────────────────────

// ─── PT Reservations Tab ────────────────────────────────────────────────────────

function PtReservationsTab() {
  const [reservations, setReservations] = useState<Array<{ id: string; status: string; startTime: string; endTime: string; memberName: string | null; memberPhone: string | null; trainerName: string | null; sessionType: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<typeof reservations>(`/admin/pt-reservations?status=${statusFilter}`);
      setReservations(data);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const STATUS_LABELS: Record<string, string> = { pending: 'Bekliyor', confirmed: 'Onaylandı', completed: 'Tamamlandı', cancelled: 'İptal' };

  const filtered = reservations
    .filter(r => !searchTerm || (r.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.trainerName || '').toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'confirmed', 'completed', 'cancelled', 'pending'].map(s => (
          <button key={s} className={`btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '4px 10px', fontSize: '0.72rem' }} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'Tümü' : STATUS_LABELS[s]}
          </button>
        ))}
        <input type="text" className="form-input" style={{ minWidth: 140, padding: '4px 10px', fontSize: '0.75rem', height: 28 }} placeholder="Üye veya eğitmen ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {loading && <p className="muted">Yükleniyor...</p>}
      {!loading && filtered.length === 0 && <div className="empty-state"><span className="empty-icon">📋</span><p>Bu filtrede randevu yok</p></div>}

      {!loading && filtered.length > 0 && (
        <div className="members-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Üye</th><th>Eğitmen</th><th>Tarih & Saat</th><th>Durum</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.memberName || '—'}</strong>{r.memberPhone && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{r.memberPhone}</div>}</td>
                  <td>{r.trainerName || '—'}</td>
                  <td><div>{new Date(r.startTime).toLocaleDateString('tr-TR')}</div><div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>{new Date(r.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}–{new Date(r.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div></td>
                  <td><span className={`status-badge status-spa-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── PT Packages Tab ────────────────────────────────────────────────────────────

function PtPackagesTab() {
  const [packages, setPackages] = useState<Array<{ id: string; name: string; sessionCount: number; price: string; validityDays: number; active: boolean }>>([]);
  const [sales, setSales] = useState<Array<{ id: string; memberName: string; memberPhone: string | null; packageName: string; sessionCount: number; remainingSessions: number; usedSessions: number; price: string; status: string; expiresAt: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'defs' | 'sales'>('defs');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sessionCount, setSessionCount] = useState(10);
  const [price, setPrice] = useState('');
  const [validityDays, setValidityDays] = useState(365);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  // Load modal
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadMembers, setLoadMembers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; ptSessions: number }>>([]);
  const [loadMemberSearch, setLoadMemberSearch] = useState('');
  const [loadSelectedMember, setLoadSelectedMember] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [loadSelectedPkg, setLoadSelectedPkg] = useState('');
  const [loadSaving, setLoadSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgTypes, salesData] = await Promise.all([
        apiJson<Array<{ id: string; name: string; sessionCount: number; price: string; validityDays: number; sessionType: string; active: boolean }>>('/admin/package-types'),
        apiJson<typeof sales>('/admin/pt-package-sales'),
      ]);
      setPackages(pkgTypes.filter(p => p.sessionType === 'personal_training'));
      setSales(salesData);
    } catch { /* */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void loadAll(); }); }, [loadAll]);

  function resetForm() { setEditId(null); setName(''); setSessionCount(10); setPrice(''); setValidityDays(365); setActive(true); setShowForm(false); }
  function startEdit(p: { id: string; name: string; sessionCount: number; price: string; validityDays: number; active: boolean }) { setEditId(p.id); setName(p.name); setSessionCount(p.sessionCount); setPrice(p.price); setValidityDays(p.validityDays); setActive(p.active); setShowForm(true); }
  async function handleSave(e: React.FormEvent) { e.preventDefault(); if (!name.trim() || !price) return; setSaving(true); try { const body = { name: name.trim(), sessionCount, price: parseFloat(price), validityDays, sessionType: 'personal_training', active }; if (editId) await apiJson(`/admin/package-types/${editId}`, { method: 'PATCH', body: JSON.stringify(body) }); else await apiJson('/admin/package-types', { method: 'POST', body: JSON.stringify(body) }); resetForm(); await loadAll(); } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); } finally { setSaving(false); } }
  async function openLoadModal() { setShowLoadModal(true); setLoadSelectedMember(null); setLoadSelectedPkg(''); setLoadMemberSearch(''); try { const m = await apiJson<Array<{ id: string; firstName: string; lastName: string; email: string; ptSessions: number }>>('/admin/members?status=active'); setLoadMembers(m); } catch { /* */ } }
  async function handleLoadPackage() { if (!loadSelectedMember || !loadSelectedPkg) return; setLoadSaving(true); try { await apiJson(`/admin/members/${loadSelectedMember.id}/assign-package`, { method: 'POST', body: JSON.stringify({ packageTypeId: loadSelectedPkg }) }); setShowLoadModal(false); await loadAll(); alert('✅ PT Paketi yüklendi'); } catch (err) { alert(err instanceof Error ? err.message : 'Hata'); } finally { setLoadSaving(false); } }

  const totalSold = sales.length;
  const totalRevenue = sales.reduce((s, p) => s + parseFloat(p.price), 0);
  const activePkgs = sales.filter(s => s.status === 'active').length;
  const filteredLoadMembers = loadMemberSearch ? loadMembers.filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(loadMemberSearch.toLowerCase())).slice(0, 10) : loadMembers.slice(0, 10);

  if (loading) return <p className="muted">Yükleniyor...</p>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Satılan PT</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{totalSold}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Gelir</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>₺{totalRevenue.toLocaleString('tr-TR')}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Aktif Paket</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{activePkgs}</div></div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <button className={`btn-sm ${subTab === 'defs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('defs')}>📦 Tanımlar ({packages.length})</button>
        <button className={`btn-sm ${subTab === 'sales' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSubTab('sales')}>🧾 Satış ({sales.length})</button>
        <div style={{ marginLeft: 'auto' }}><button className="btn-sm btn-primary" onClick={() => void openLoadModal()}>🎫 Üyeye PT Yükle</button></div>
      </div>

      {subTab === 'defs' && (<div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}><button className="btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ PT Paketi Ekle</button></div>
        {showForm && (<form onSubmit={(e) => void handleSave(e)} className="spa-form-panel" style={{ display: 'grid', gap: '0.75rem' }}><h4>{editId ? '✏️ Düzenle' : '+ Yeni PT Paketi'}</h4><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}><label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span className="form-label">Paket Adı *</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="form-input" /></label><label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span className="form-label">Durum</span><select value={active?'true':'false'} onChange={(e) => setActive(e.target.value==='true')} className="form-input"><option value="true">Aktif</option><option value="false">Pasif</option></select></label></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}><label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span className="form-label">Seans *</span><input type="number" value={sessionCount} onChange={(e) => setSessionCount(Number(e.target.value))} min={1} className="form-input" /></label><label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span className="form-label">Fiyat (₺) *</span><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="form-input" /></label><label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}><span className="form-label">Geçerlilik (gün)</span><input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} min={1} className="form-input" /></label></div>{price && sessionCount > 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>💡 Seans/₺{Math.round(parseFloat(price)/sessionCount).toLocaleString('tr-TR')}</p>}<div style={{ display: 'flex', gap: '0.5rem' }}><button type="submit" className="btn-sm btn-primary" disabled={saving}>{saving ? '⏳...' : editId ? '✓ Güncelle' : '✓ Oluştur'}</button><button type="button" className="btn-sm btn-outline" onClick={resetForm}>İptal</button></div></form>)}
        {packages.length === 0 ? <div className="empty-state"><span className="empty-icon">📦</span><p>PT paketi tanımlı değil</p></div> : (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>{packages.map(p => { const sold = sales.filter(s => s.packageName === p.name).length; return (<div key={p.id} className="service-card"><div className="service-card-header"><span className="service-category">🏋️ {p.sessionCount} Seans</span><span className={`service-status ${p.active?'active':'inactive'}`}>{p.active?'Aktif':'Pasif'}</span></div><h3 className="service-name">{p.name}</h3><div className="service-meta"><span>📅 {p.validityDays} gün</span><span className="service-price">₺{parseFloat(p.price).toLocaleString('tr-TR')}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}><span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Seans/₺{Math.round(parseFloat(p.price)/p.sessionCount).toLocaleString('tr-TR')} · {sold} satış</span><div style={{ display: 'flex', gap: '4px' }}><button className="btn-sm btn-outline" style={{ padding: '3px 6px', fontSize: '0.68rem' }} onClick={() => startEdit(p)}>✏️</button><button className="btn-sm btn-danger" style={{ padding: '3px 6px', fontSize: '0.68rem' }} onClick={() => { if (confirm('Pasif yapılacak?')) void apiJson(`/admin/package-types/${p.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) }).then(() => void loadAll()); }}>🗑</button></div></div></div>);})}</div>)}
      </div>)}

      {subTab === 'sales' && (<div>{sales.length === 0 ? <div className="empty-state"><span className="empty-icon">🧾</span><p>PT satışı yok</p></div> : <div className="members-table-wrapper"><table className="data-table"><thead><tr><th>Üye</th><th>Paket</th><th>Kullanım</th><th>Fiyat</th><th>Tarih</th><th>Bitiş</th><th>Durum</th></tr></thead><tbody>{sales.map(s => (<tr key={s.id}><td><strong>{s.memberName}</strong>{s.memberPhone && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{s.memberPhone}</div>}</td><td>{s.packageName}</td><td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}><div style={{ width: `${Math.round((s.usedSessions/s.sessionCount)*100)}%`, height: '100%', background: s.remainingSessions > 0 ? '#22c55e' : '#ef4444', borderRadius: 3 }}></div></div><span style={{ fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{s.usedSessions}/{s.sessionCount}</span></div></td><td style={{ fontWeight: 700 }}>₺{parseFloat(s.price).toLocaleString('tr-TR')}</td><td style={{ fontSize: '0.78rem' }}>{new Date(s.createdAt).toLocaleDateString('tr-TR')}</td><td style={{ fontSize: '0.78rem' }}>{new Date(s.expiresAt).toLocaleDateString('tr-TR')}</td><td><span className={`status-badge ${s.status==='active'?'status-active':s.status==='depleted'?'status-spa-completed':'status-spa-cancelled'}`}>{s.status==='active'?'Aktif':s.status==='depleted'?'Tükendi':'Doldu'}</span></td></tr>))}</tbody></table></div>}</div>)}

      {showLoadModal && (<div className="agenda-modal-overlay" onClick={() => setShowLoadModal(false)}><div className="agenda-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}><div className="agenda-modal-header"><h3>🎫 Üyeye PT Paketi Yükle</h3><button className="agenda-modal-close" onClick={() => setShowLoadModal(false)}>✕</button></div><div className="agenda-modal-form"><label className="form-label">Paket *</label><select className="form-input" value={loadSelectedPkg} onChange={(e) => setLoadSelectedPkg(e.target.value)}><option value="">— Seçin —</option>{packages.filter(p=>p.active).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sessionCount} seans · ₺{parseFloat(p.price).toLocaleString('tr-TR')})</option>)}</select><label className="form-label" style={{ marginTop: '0.75rem' }}>Üye *</label><input type="text" className="form-input" placeholder="İsim ile ara..." value={loadMemberSearch} onChange={(e) => setLoadMemberSearch(e.target.value)} />{loadSelectedMember ? <div className="agenda-selected-member">✅ {loadSelectedMember.firstName} {loadSelectedMember.lastName}<button className="btn-sm btn-outline" style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => setLoadSelectedMember(null)}>Değiştir</button></div> : <div className="agenda-member-list">{filteredLoadMembers.map(m => <div key={m.id} className="agenda-member-item" onClick={() => setLoadSelectedMember(m)}><div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}><div><strong>{m.firstName} {m.lastName}</strong><span style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block' }}>{m.email}</span></div>{m.ptSessions > 0 ? <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#dcfce7', color: '#166534' }}>🏋️ {m.ptSessions}</span> : <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#64748b' }}>Paket yok</span>}</div></div>)}</div>}<div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}><button className="btn-sm btn-primary" disabled={!loadSelectedMember || !loadSelectedPkg || loadSaving} onClick={() => void handleLoadPackage()}>{loadSaving ? '⏳...' : '✓ Yükle'}</button><button className="btn-sm btn-outline" onClick={() => setShowLoadModal(false)}>İptal</button></div></div></div></div>)}
    </div>
  );
}

// ─── PT Reports Tab ─────────────────────────────────────────────────────────────

function PtReportsTab() {
  const [stats, setStats] = useState<Array<{ trainerId: string; trainerName: string; totalSlots: number; bookedSlots: number; occupancyPct: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    const from = new Date(now);
    if (period === 'week') from.setDate(now.getDate() - 7); else from.setDate(now.getDate() - 30);

    apiJson<TrainerAgenda[]>(`/admin/trainers/agenda?from=${from.toISOString().slice(0, 10)}&to=${now.toISOString().slice(0, 10)}`)
      .then(data => {
        const s = data.map(t => {
          const total = t.slots.length;
          const booked = t.slots.filter(sl => sl.booked).length;
          return { trainerId: t.trainerId, trainerName: t.trainerName, totalSlots: total, bookedSlots: booked, occupancyPct: total > 0 ? Math.round((booked / total) * 100) : 0 };
        });
        setStats(s.sort((a, b) => b.occupancyPct - a.occupancyPct));
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [period]);

  if (loading) return <p className="muted">Rapor yükleniyor...</p>;

  const totalSessions = stats.reduce((s, t) => s + t.bookedSlots, 0);
  const totalSlots = stats.reduce((s, t) => s + t.totalSlots, 0);
  const avgOcc = totalSlots > 0 ? Math.round((totalSessions / totalSlots) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 className="spa-section-title" style={{ margin: 0 }}>📊 Eğitmen Performansı</h3>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className={`btn-sm ${period === 'week' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('week')}>7 Gün</button>
          <button className={`btn-sm ${period === 'month' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriod('month')}>30 Gün</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Ders</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent)' }}>{totalSessions}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Toplam Slot</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{totalSlots}</div></div>
        <div className="stat-card"><div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Ort. Doluluk</div><div style={{ fontSize: '1.5rem', fontWeight: 800, color: avgOcc >= 70 ? '#059669' : '#d97706' }}>%{avgOcc}</div></div>
      </div>

      <div className="members-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Eğitmen</th><th>Slot</th><th>Ders</th><th>Doluluk</th><th>Görsel</th></tr></thead>
          <tbody>
            {stats.map(t => (
              <tr key={t.trainerId}>
                <td><strong>{t.trainerName}</strong></td>
                <td>{t.totalSlots}</td>
                <td>{t.bookedSlots}</td>
                <td><span style={{ fontWeight: 700, color: t.occupancyPct >= 70 ? '#059669' : t.occupancyPct >= 40 ? '#d97706' : '#dc2626' }}>%{t.occupancyPct}</span></td>
                <td><div style={{ width: '100%', maxWidth: 120, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${t.occupancyPct}%`, height: '100%', background: t.occupancyPct >= 70 ? '#22c55e' : t.occupancyPct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: 4 }}></div></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
