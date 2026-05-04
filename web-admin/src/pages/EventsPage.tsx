import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiJson, ApiError } from '../lib/api';
import { setAdminLanguage } from '../i18n';
import { useAuth } from '../auth/AuthContext';

type ClubEventAdmin = {
  id: string;
  title: string;
  description: string | null;
  coachName: string | null;
  location: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number;
  published: boolean;
  createdAt: string;
};

function toIsoFromDateAndTime(date: string, time: string): string {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error('invalid date');
  }
  return d.toISOString();
}

function fmtLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function EventsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<ClubEventAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coachName, setCoachName] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [published, setPublished] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiJson<ClubEventAdmin[]>('/admin/events', { method: 'GET' });
      setRows(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('eventsPage.loadError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (
      !title.trim() ||
      !coachName.trim() ||
      !location.trim() ||
      !eventDate ||
      !startTime ||
      !endTime
    ) {
      setError(t('eventsPage.validation'));
      return;
    }
    setSaving(true);
    try {
      const startsAt = toIsoFromDateAndTime(eventDate, startTime);
      const endsAt = toIsoFromDateAndTime(eventDate, endTime);
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        coachName: coachName.trim(),
        location: location.trim(),
        imageUrl: imageUrl.trim() || undefined,
        startsAt,
        endsAt,
        capacity: Number.parseInt(capacity, 10) || 30,
        published,
      };
      await apiJson('/admin/events', { method: 'POST', body: JSON.stringify(body) });
      setTitle('');
      setDescription('');
      setCoachName('');
      setLocation('');
      setImageUrl('');
      setEventDate('');
      setStartTime('');
      setEndTime('');
      setCapacity('30');
      setPublished(true);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('eventsPage.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t('eventsPage.confirmDelete'))) {
      return;
    }
    setDeletingId(id);
    setError(null);
    try {
      await apiJson(`/admin/events/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('eventsPage.deleteError'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <h1>{t('eventsPage.title')}</h1>
          <p className="muted">
            {user?.firstName} {user?.lastName} · {user?.email}
          </p>
        </div>
        <div className="topbarActions">
          <div className="langBar inline">
            <button
              type="button"
              className={i18n.language === 'tr' ? 'langActive' : 'secondary'}
              onClick={() => setAdminLanguage('tr')}
            >
              {t('lang.tr')}
            </button>
            <button
              type="button"
              className={i18n.language === 'en' ? 'langActive' : 'secondary'}
              onClick={() => setAdminLanguage('en')}
            >
              {t('lang.en')}
            </button>
          </div>
          <Link className="secondary" to="/">
            {t('eventsPage.back')}
          </Link>
        </div>
      </header>

      <section className="card">
        <h2>{t('eventsPage.createTitle')}</h2>
        <p className="muted">{t('eventsPage.createHint')}</p>
        {error ? <p className="error">{error}</p> : null}
        <form className="form" onSubmit={(e) => void onCreate(e)}>
          <label>
            {t('eventsPage.fieldTitle')}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            {t('eventsPage.fieldDescription')}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={8000}
              rows={3}
            />
          </label>
          <label>
            {t('eventsPage.fieldCoach')}
            <input
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            {t('eventsPage.fieldLocation')}
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              maxLength={300}
            />
          </label>
          <label>
            {t('eventsPage.fieldImageUrl')}
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              maxLength={2000}
            />
          </label>
          <label>
            {t('eventsPage.fieldDate')}
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </label>
          <label>
            {t('eventsPage.fieldStartTime')}
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label>
            {t('eventsPage.fieldEndTime')}
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>
          <label>
            {t('eventsPage.fieldCapacity')}
            <input
              type="number"
              min={1}
              max={50000}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label className="inlineCheck">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <span>{t('eventsPage.fieldPublished')}</span>
          </label>
          <button type="submit" disabled={saving}>
            {saving ? t('eventsPage.saving') : t('eventsPage.submit')}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>{t('eventsPage.listTitle')}</h2>
        <button type="button" className="secondary" onClick={() => void load()} disabled={loading}>
          {loading ? t('eventsPage.loading') : t('eventsPage.refresh')}
        </button>
        {loading && rows.length === 0 ? <p className="muted">{t('eventsPage.loading')}</p> : null}
        {!loading && rows.length === 0 ? <p className="muted">{t('eventsPage.empty')}</p> : null}
        {rows.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>{t('eventsPage.colTitle')}</th>
                <th>{t('eventsPage.colCoach')}</th>
                <th>{t('eventsPage.colLocation')}</th>
                <th>{t('eventsPage.colStarts')}</th>
                <th>{t('eventsPage.colEnds')}</th>
                <th>{t('eventsPage.colCap')}</th>
                <th>{t('eventsPage.colPub')}</th>
                <th>{t('eventsPage.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{r.coachName ?? '-'}</td>
                  <td>{r.location ?? '-'}</td>
                  <td>{fmtLocal(r.startsAt)}</td>
                  <td>{r.endsAt ? fmtLocal(r.endsAt) : '-'}</td>
                  <td>{r.capacity}</td>
                  <td>{r.published ? t('eventsPage.yes') : t('eventsPage.no')}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      disabled={deletingId === r.id}
                      onClick={() => void remove(r.id)}
                    >
                      {deletingId === r.id ? t('eventsPage.deleting') : t('eventsPage.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}
