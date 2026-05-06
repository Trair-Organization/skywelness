import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ApiError, apiJson } from '../lib/api';

type StudentRow = {
  memberUserId: string;
  member: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
};

type NoteRow = {
  id: string;
  createdAt: string;
  note: string;
};

export function TrainerStudentsPage() {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [newNote, setNewNote] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMemberName = useMemo(() => {
    const row = students.find((student) => student.memberUserId === selectedMemberId);
    if (!row) return '';
    return `${row.member.firstName} ${row.member.lastName}`.trim();
  }, [students, selectedMemberId]);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    setError(null);
    try {
      const rows = await apiJson<StudentRow[]>('/trainer-network/my-students', { method: 'GET' });
      setStudents(rows);
      if (rows.length > 0 && !selectedMemberId) {
        setSelectedMemberId(rows[0].memberUserId);
      }
      if (rows.length === 0) {
        setSelectedMemberId('');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('trainerStudents.loadError'));
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedMemberId, t]);

  const loadNotes = useCallback(
    async (memberUserId: string) => {
      if (!memberUserId) {
        setNotes([]);
        return;
      }
      setLoadingNotes(true);
      setError(null);
      try {
        const rows = await apiJson<NoteRow[]>(
          `/trainer-network/notes?memberUserId=${encodeURIComponent(memberUserId)}`,
          { method: 'GET' },
        );
        setNotes(rows);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('trainerStudents.notesError'));
      } finally {
        setLoadingNotes(false);
      }
    },
    [t],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void loadStudents();
    });
  }, [loadStudents]);

  useEffect(() => {
    if (selectedMemberId) {
      const timer = window.setTimeout(() => {
        void loadNotes(selectedMemberId);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [loadNotes, selectedMemberId]);

  async function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!selectedMemberId || !newNote.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiJson('/trainer-network/student-note', {
        method: 'POST',
        body: JSON.stringify({ memberUserId: selectedMemberId, note: newNote.trim() }),
      });
      setNewNote('');
      await loadNotes(selectedMemberId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('trainerStudents.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{t('trainerStudents.title')}</h1>
        <Link className="secondary" to="/trainer/dashboard">
          {t('trainerStudents.back')}
        </Link>
      </header>

      {error ? <p className="error">{error}</p> : null}
      <section className="card">
        <div className="rowBetween">
          <h2>{t('trainerStudents.students')}</h2>
          <button type="button" className="secondary" onClick={() => void loadStudents()}>
            {loadingStudents ? t('trainerStudents.loading') : t('trainerStudents.refresh')}
          </button>
        </div>
        {loadingStudents ? (
          <p className="muted">{t('trainerStudents.loading')}</p>
        ) : students.length === 0 ? (
          <p className="muted">{t('trainerStudents.empty')}</p>
        ) : (
          <label>
            {t('trainerStudents.select')}
            <select
              className="inputLike"
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
            >
              {students.map((student) => (
                <option key={student.memberUserId} value={student.memberUserId}>
                  {student.member.firstName} {student.member.lastName} - {student.member.email}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="card">
        <h2>{t('trainerStudents.addNote')}</h2>
        <p className="muted">
          {selectedMemberName
            ? `${t('trainerStudents.selected')}: ${selectedMemberName}`
            : t('trainerStudents.selectHint')}
        </p>
        <form className="form" onSubmit={submitNote}>
          <label>
            {t('trainerStudents.note')}
            <textarea
              rows={4}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              maxLength={1000}
              required
            />
          </label>
          <button type="submit" disabled={!selectedMemberId || saving}>
            {saving ? t('trainerStudents.saving') : t('trainerStudents.submit')}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>{t('trainerStudents.notes')}</h2>
        {loadingNotes ? (
          <p className="muted">{t('trainerStudents.loading')}</p>
        ) : notes.length === 0 ? (
          <p className="muted">{t('trainerStudents.noNotes')}</p>
        ) : (
          <ul className="notesList">
            {notes.map((note) => (
              <li key={note.id}>
                <p>{note.note}</p>
                <small className="muted">{new Date(note.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
