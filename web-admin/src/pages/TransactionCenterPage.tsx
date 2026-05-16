import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiJson } from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────────

type TransactionRow = {
  id: string;
  date: string;
  memberName: string;
  memberId: string;
  serviceType: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
};

type TransactionMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TransactionListResponse = {
  data: TransactionRow[];
  meta: TransactionMeta;
};

type TransactionSummary = {
  totalSpending: number;
  totalSessions: number;
  lastVisitDate: string | null;
};

type MostActiveMember = {
  memberId: string;
  memberName: string;
  transactionCount: number;
  totalSpending: number;
};

type MemberOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

// ─── Service type label map ─────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<string, string> = {
  massage: 'Masaj',
  personal_training: 'PT',
  padel: 'Padel',
  cafe: 'Kafe',
  event: 'Etkinlik',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Bekliyor',
  succeeded: 'Başarılı',
  failed: 'Başarısız',
  refunded: 'İade',
};

const SERVICE_FILTER_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'massage', label: 'Masaj' },
  { value: 'personal_training', label: 'PT' },
  { value: 'padel', label: 'Padel' },
  { value: 'cafe', label: 'Kafe' },
  { value: 'event', label: 'Etkinlik' },
];

// ─── Main Component ─────────────────────────────────────────────────────────────

export function TransactionCenterPage() {
  const [searchParams] = useSearchParams();
  // State
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [meta, setMeta] = useState<TransactionMeta>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [serviceType, setServiceType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [mostActive, setMostActive] = useState<MostActiveMember[]>([]);

  const [page, setPage] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(false);

  const dateError =
    startDate && endDate && startDate > endDate
      ? 'Başlangıç tarihi bitiş tarihinden sonra olamaz'
      : '';

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-select member from URL param
  useEffect(() => {
    const urlMemberId = searchParams.get('memberId');
    if (urlMemberId && !selectedMember) {
      (async () => {
        try {
          const members = await apiJson<MemberOption[]>(`/admin/members?search=`);
          const found = members.find((m) => m.id === urlMemberId);
          if (found) {
            setSelectedMember(found);
            setSearchQuery(`${found.firstName} ${found.lastName}`);
          }
        } catch {
          /* ignore */
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load Transactions ──────────────────────────────────────────────────────

  const loadTransactions = useCallback(
    async (p: number = 1) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', String(p));
        params.set('limit', '25');
        if (selectedMember) params.set('memberId', selectedMember.id);
        if (serviceType) params.set('serviceType', serviceType);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await apiJson<TransactionListResponse>(
          `/admin/transactions?${params.toString()}`,
        );
        setTransactions(res.data);
        setMeta(res.meta);
      } catch {
        setError('İşlemler yüklenemedi');
      }
      setLoading(false);
    },
    [selectedMember, serviceType, startDate, endDate],
  );

  // ─── Load Summary ───────────────────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    if (!selectedMember) {
      setSummary(null);
      return;
    }
    try {
      const params = new URLSearchParams({ memberId: selectedMember.id });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiJson<TransactionSummary>(
        `/admin/transactions/summary?${params.toString()}`,
      );
      setSummary(res);
    } catch {
      setSummary(null);
    }
  }, [selectedMember, startDate, endDate]);

  // ─── Load Most Active ──────────────────────────────────────────────────────

  const loadMostActive = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await apiJson<MostActiveMember[]>(
        `/admin/transactions/most-active?${params.toString()}`,
      );
      setMostActive(res);
    } catch {
      setMostActive([]);
    }
  }, [startDate, endDate]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (dateError) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    void loadTransactions(1);
    void loadSummary();
    void loadMostActive();
  }, [loadTransactions, loadSummary, loadMostActive, startDate, endDate, dateError]);

  // ─── Member Search ──────────────────────────────────────────────────────────

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length < 2) {
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiJson<MemberOption[]>(
          `/admin/members?search=${encodeURIComponent(value)}`,
        );
        setSearchResults(res.slice(0, 10));
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      }
      setSearchLoading(false);
    }, 300);
  };

  const handleSelectMember = (member: MemberOption) => {
    setSelectedMember(member);
    setSearchQuery(`${member.firstName} ${member.lastName}`);
    setShowDropdown(false);
  };

  const handleClearSearch = () => {
    setSelectedMember(null);
    setSearchQuery('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleClickMostActive = (m: MostActiveMember) => {
    const member: MemberOption = {
      id: m.memberId,
      firstName: m.memberName.split(' ')[0] || '',
      lastName: m.memberName.split(' ').slice(1).join(' ') || '',
      email: '',
    };
    handleSelectMember(member);
  };

  // ─── Pagination ─────────────────────────────────────────────────────────────

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    void loadTransactions(newPage);
  };

  // ─── PDF Export ─────────────────────────────────────────────────────────────

  const handlePdfExport = async () => {
    setPdfLoading(true);
    try {
      // Fetch all filtered data (max 500)
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '500');
      if (selectedMember) params.set('memberId', selectedMember.id);
      if (serviceType) params.set('serviceType', serviceType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await apiJson<TransactionListResponse>(
        `/admin/transactions?${params.toString()}`,
      );

      // Generate simple CSV-style export (PDF library not available - use HTML-to-print)
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Popup engelleyici aktif, lütfen izin verin.');
        setPdfLoading(false);
        return;
      }

      const filterSummary = [
        selectedMember ? `Üye: ${selectedMember.firstName} ${selectedMember.lastName}` : '',
        serviceType ? `Tür: ${SERVICE_TYPE_LABELS[serviceType]}` : '',
        startDate ? `Başlangıç: ${startDate}` : '',
        endDate ? `Bitiş: ${endDate}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const rows = res.data
        .map(
          (t) =>
            `<tr>
              <td>${new Date(t.date).toLocaleDateString('tr-TR')}</td>
              <td>${t.memberName}</td>
              <td>${SERVICE_TYPE_LABELS[t.serviceType] || t.serviceType}</td>
              <td>${t.description}</td>
              <td>₺${t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
              <td>${STATUS_LABELS[t.status] || t.status}</td>
            </tr>`,
        )
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>İşlem Merkezi Raporu</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 12px; }
            h1 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            .meta { color: #666; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>İşlem Merkezi Raporu</h1>
          <p class="meta">Tarih: ${new Date().toLocaleString('tr-TR')}</p>
          ${filterSummary ? `<p class="meta">Filtreler: ${filterSummary}</p>` : ''}
          <p class="meta">Toplam: ${res.meta.total} işlem</p>
          <table>
            <thead>
              <tr><th>Tarih</th><th>Üye</th><th>Tür</th><th>Açıklama</th><th>Tutar</th><th>Durum</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch {
      alert('PDF oluşturulamadı');
    }
    setPdfLoading(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1200, position: 'relative' }}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>İşlem Merkezi</h1>
          <p style={styles.subtitle}>Tüm üye hizmet geçmişi</p>
        </div>
        <button
          style={{
            ...styles.pdfBtn,
            opacity: transactions.length === 0 ? 0.5 : 1,
            cursor: transactions.length === 0 ? 'not-allowed' : 'pointer',
          }}
          disabled={transactions.length === 0 || pdfLoading}
          onClick={handlePdfExport}
        >
          {pdfLoading ? '⏳ Hazırlanıyor...' : '📄 PDF İndir'}
        </button>
      </div>

      {/* Search + Filters */}
      <div style={styles.filtersRow}>
        {/* Member Search */}
        <div style={{ position: 'relative', flex: 2, minWidth: 220 }}>
          <div style={styles.searchInputWrap}>
            <input
              type="text"
              placeholder="Üye ara (ad, soyad, email)..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
              style={styles.searchInput}
            />
            {searchLoading && <span style={styles.searchSpinner}>⏳</span>}
            {selectedMember && (
              <button style={styles.clearBtn} onClick={handleClearSearch}>
                ✕
              </button>
            )}
          </div>
          {showDropdown && (
            <div style={styles.dropdown}>
              {searchResults.length === 0 ? (
                <div style={styles.dropdownEmpty}>Üye bulunamadı</div>
              ) : (
                searchResults.map((m) => (
                  <div key={m.id} style={styles.dropdownItem} onClick={() => handleSelectMember(m)}>
                    <span style={{ fontWeight: 600 }}>
                      {m.firstName} {m.lastName}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: 8 }}>
                      {m.email}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Service Type Filter */}
        <select
          value={serviceType}
          onChange={(e) => setServiceType(e.target.value)}
          style={styles.filterSelect}
        >
          {SERVICE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={styles.dateInput}
          placeholder="Başlangıç"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={styles.dateInput}
          placeholder="Bitiş"
        />
      </div>
      {dateError && (
        <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '4px 0 12px' }}>{dateError}</p>
      )}

      {/* Summary Cards */}
      {selectedMember && summary && (
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>💰</div>
            <div style={styles.summaryValue}>
              ₺{summary.totalSpending.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
            <div style={styles.summaryLabel}>Toplam Harcama</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>📅</div>
            <div style={styles.summaryValue}>{summary.totalSessions}</div>
            <div style={styles.summaryLabel}>Toplam Seans</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIcon}>🕐</div>
            <div style={styles.summaryValue}>
              {summary.lastVisitDate
                ? new Date(summary.lastVisitDate).toLocaleDateString('tr-TR')
                : '—'}
            </div>
            <div style={styles.summaryLabel}>Son Ziyaret</div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div style={styles.contentGrid}>
        {/* Transaction Table */}
        <div style={{ flex: 3, minWidth: 0 }}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>İşlemler</h2>
            {error ? (
              <div style={styles.errorState}>
                <p>{error}</p>
                <button style={styles.retryBtn} onClick={() => loadTransactions(page)}>
                  Tekrar Dene
                </button>
              </div>
            ) : loading ? (
              <p style={styles.emptyText}>Yükleniyor...</p>
            ) : transactions.length === 0 ? (
              <p style={styles.emptyText}>Seçili filtrelere uygun işlem bulunamadı.</p>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Tarih</th>
                        <th style={styles.th}>Üye</th>
                        <th style={styles.th}>Tür</th>
                        <th style={styles.th}>Açıklama</th>
                        <th style={styles.th}>Tutar</th>
                        <th style={styles.th}>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.id}>
                          <td style={styles.td}>{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                          <td style={styles.td}>{t.memberName}</td>
                          <td style={styles.td}>
                            <span style={styles.typeBadge}>
                              {SERVICE_TYPE_LABELS[t.serviceType] || t.serviceType}
                            </span>
                          </td>
                          <td style={styles.td}>{t.description}</td>
                          <td style={styles.td}>
                            ₺{t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.statusBadge,
                                background:
                                  t.status === 'succeeded'
                                    ? '#dcfce7'
                                    : t.status === 'failed'
                                      ? '#fee2e2'
                                      : t.status === 'refunded'
                                        ? '#fef3c7'
                                        : '#f1f5f9',
                                color:
                                  t.status === 'succeeded'
                                    ? '#166534'
                                    : t.status === 'failed'
                                      ? '#991b1b'
                                      : t.status === 'refunded'
                                        ? '#92400e'
                                        : '#475569',
                              }}
                            >
                              {STATUS_LABELS[t.status] || t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div style={styles.pagination}>
                  <button
                    style={styles.pageBtn}
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                  >
                    ← Önceki
                  </button>
                  <span style={styles.pageInfo}>
                    {meta.page} / {meta.totalPages} (Toplam: {meta.total})
                  </span>
                  <button
                    style={styles.pageBtn}
                    disabled={page >= meta.totalPages}
                    onClick={() => handlePageChange(page + 1)}
                  >
                    Sonraki →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Most Active Members Sidebar */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>En Aktif Üyeler</h2>
            {mostActive.length === 0 ? (
              <p style={styles.emptyText}>Veri bulunamadı.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {mostActive.map((m, i) => (
                  <div
                    key={m.memberId}
                    style={styles.activeRow}
                    onClick={() => handleClickMostActive(m)}
                  >
                    <span style={styles.activeRank}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={styles.activeName}>{m.memberName}</div>
                      <div style={styles.activeStat}>
                        {m.transactionCount} işlem • ₺
                        {m.totalSpending.toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
                      </div>
                    </div>
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

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: { fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' },
  pdfBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  filtersRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  searchInputWrap: { position: 'relative' as const, display: 'flex', alignItems: 'center' },
  searchInput: {
    width: '100%',
    padding: '10px 36px 10px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
  },
  searchSpinner: { position: 'absolute' as const, right: 36, fontSize: '0.8rem' },
  clearBtn: {
    position: 'absolute' as const,
    right: 8,
    background: 'none',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
    color: '#94a3b8',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 50,
    maxHeight: 240,
    overflowY: 'auto' as const,
  },
  dropdownItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
  },
  dropdownEmpty: { padding: '10px 12px', color: '#94a3b8', fontSize: '0.85rem' },
  filterSelect: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: '0.85rem',
    background: '#fff',
    minWidth: 100,
  },
  dateInput: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: '0.85rem',
    minWidth: 130,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '18px 16px',
  },
  summaryIcon: { fontSize: '1.4rem', marginBottom: 6 },
  summaryValue: { fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' },
  summaryLabel: { fontSize: '0.78rem', color: '#64748b', marginTop: 2 },
  contentGrid: { display: 'flex', gap: 20, flexWrap: 'wrap' as const },
  section: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 20,
  },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' },
  emptyText: { color: '#94a3b8', fontSize: '0.9rem', marginTop: 12 },
  errorState: { textAlign: 'center' as const, padding: 24 },
  retryBtn: {
    marginTop: 8,
    padding: '8px 16px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginTop: 12, fontSize: '0.85rem' },
  th: {
    textAlign: 'left' as const,
    padding: '10px 8px',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 700,
    color: '#374151',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #f1f5f9',
    color: '#374151',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: '#eff6ff',
    color: '#2563eb',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 8,
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px solid #f1f5f9',
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  pageInfo: { fontSize: '0.85rem', color: '#64748b' },
  activeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
  },
  activeRank: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#2563eb',
    flexShrink: 0,
  },
  activeName: { fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' },
  activeStat: { fontSize: '0.75rem', color: '#64748b' },
};
