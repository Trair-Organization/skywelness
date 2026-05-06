import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ApiError, apiJson } from '../lib/api';

type PendingMember = { id: string };
type ClubEvent = { id: string; published: boolean };
type Trainer = { id: string; isIndependent?: boolean };
type PendingTrainerApplication = { id: string };

type Metrics = {
  pendingMembers: number;
  activeEvents: number;
  trainersTotal: number;
  trainersClub: number;
  trainersIndependent: number;
  pendingTrainerApplications: number;
};

export function ClubInsightsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({
    pendingMembers: 0,
    activeEvents: 0,
    trainersTotal: 0,
    trainersClub: 0,
    trainersIndependent: 0,
    pendingTrainerApplications: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingMembers, events, trainers] = await Promise.all([
        apiJson<PendingMember[]>('/admin/pending-members', { method: 'GET' }),
        apiJson<ClubEvent[]>('/admin/events', { method: 'GET' }),
        apiJson<Trainer[]>('/trainers', { method: 'GET' }),
      ]);

      let pendingTrainerApplications = 0;
      try {
        const appRows = await apiJson<PendingTrainerApplication[]>(
          '/platform-admin/trainer-applications/pending',
          { method: 'GET' },
        );
        pendingTrainerApplications = appRows.length;
      } catch {
        pendingTrainerApplications = 0;
      }

      setMetrics({
        pendingMembers: pendingMembers.length,
        activeEvents: events.filter((event) => event.published).length,
        trainersTotal: trainers.length,
        trainersClub: trainers.filter((trainer) => !trainer.isIndependent).length,
        trainersIndependent: trainers.filter((trainer) => trainer.isIndependent).length,
        pendingTrainerApplications,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('clubInsights.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{t('clubInsights.title')}</h1>
        <div className="topbarActions">
          <button
            type="button"
            className="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? t('clubInsights.loading') : t('clubInsights.refresh')}
          </button>
          <Link className="secondary" to="/club/dashboard">
            {t('clubInsights.back')}
          </Link>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      <section className="metricsGrid">
        <article className="metricCard">
          <p className="muted">{t('clubInsights.pendingMembers')}</p>
          <h2>{metrics.pendingMembers}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('clubInsights.activeEvents')}</p>
          <h2>{metrics.activeEvents}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('clubInsights.trainersTotal')}</p>
          <h2>{metrics.trainersTotal}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('clubInsights.trainersClub')}</p>
          <h2>{metrics.trainersClub}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('clubInsights.trainersIndependent')}</p>
          <h2>{metrics.trainersIndependent}</h2>
        </article>
        <article className="metricCard">
          <p className="muted">{t('clubInsights.pendingApplications')}</p>
          <h2>{metrics.pendingTrainerApplications}</h2>
        </article>
      </section>
    </div>
  );
}
