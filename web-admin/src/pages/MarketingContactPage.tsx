import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError, apiJson } from '../lib/api';

export function MarketingContactPage() {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [clubCount, setClubCount] = useState('1');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSent(false);
    try {
      await apiJson('/auth/register-partner', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          city: city.trim(),
          clubCount: Number.parseInt(clubCount, 10) || 1,
          website: website.trim() || undefined,
          notes: message.trim() || undefined,
        }),
      });
      setSent(true);
      setCompanyName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setCity('');
      setClubCount('1');
      setWebsite('');
      setMessage('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('contact.error'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="shell marketing">
      <header className="topbar">
        <h1>{t('contact.title')}</h1>
        <Link className="secondary" to="/">
          {t('contact.back')}
        </Link>
      </header>

      <section className="card">
        <p className="muted">{t('contact.subtitle')}</p>
        <form className="form" onSubmit={(e) => void onSubmit(e)}>
          <label>
            {t('contact.company')}
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </label>
          <label>
            {t('contact.name')}
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
          </label>
          <label>
            {t('contact.email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {t('contact.phone')}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <label>
            {t('contact.city')}
            <input value={city} onChange={(e) => setCity(e.target.value)} required />
          </label>
          <label>
            {t('contact.clubCount')}
            <input
              type="number"
              min={1}
              value={clubCount}
              onChange={(e) => setClubCount(e.target.value)}
            />
          </label>
          <label>
            {t('contact.website')}
            <input
              type="url"
              placeholder="https://"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
          <label>
            {t('contact.message')}
            <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={pending}>
            {pending ? t('contact.sending') : t('contact.send')}
          </button>
        </form>
        {sent ? <p className="muted">{t('contact.success')}</p> : null}
      </section>
    </div>
  );
}
