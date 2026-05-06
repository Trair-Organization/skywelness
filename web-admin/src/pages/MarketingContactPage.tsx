import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarketingContactForm } from '../components/MarketingContactForm';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingContactPage() {
  const { t } = useTranslation();

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
        <MarketingContactForm />
      </section>

      <MarketingFooter />
    </div>
  );
}
