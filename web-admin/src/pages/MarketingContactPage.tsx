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
        <div className="contactMeta">
          <p>
            <strong>{t('contact.directEmail')}</strong> info@wellnessclub.com
          </p>
          <p>
            <strong>{t('contact.instagram')}</strong> @wellnessclub.tr
          </p>
        </div>
        <MarketingContactForm />
      </section>

      <MarketingFooter />
    </div>
  );
}
