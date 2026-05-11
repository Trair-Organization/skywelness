import { useState } from 'react';
import { TrainersManagementPage } from './TrainersManagementPage';
import { ClubReservationRequestsPage } from './ClubReservationRequestsPage';

export function PtManagementPage() {
  const [tab, setTab] = useState<'trainers' | 'reservations'>('trainers');

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🏋️ PT Yönetimi</h1>
          <p className="muted">Eğitmenler ve PT rezervasyonlarını yönetin</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setTab('trainers')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: tab === 'trainers' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(148,163,184,0.15)',
            background: tab === 'trainers' ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: tab === 'trainers' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🏋️ Eğitmenler
        </button>
        <button
          onClick={() => setTab('reservations')}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: tab === 'reservations' ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(148,163,184,0.15)',
            background: tab === 'reservations' ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: tab === 'reservations' ? '#38bdf8' : '#94a3b8',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          📝 PT Rezervasyonları
        </button>
      </div>

      {tab === 'trainers' && <TrainersManagementPage embedded />}
      {tab === 'reservations' && <ClubReservationRequestsPage embedded />}
    </div>
  );
}
