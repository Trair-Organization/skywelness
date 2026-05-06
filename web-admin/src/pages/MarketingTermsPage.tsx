import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingTermsPage() {
  const { t } = useTranslation();

  return (
    <div className="shell marketing">
      <header className="topbar">
        <h1>{t('terms.title')}</h1>
        <Link className="secondary" to="/">
          {t('terms.back')}
        </Link>
      </header>

      <section className="card legal">
        <p>{t('terms.intro')}</p>
        <h2>{t('terms.section1Title')}</h2>
        <p>{t('terms.section1Body')}</p>
        <h2>{t('terms.section2Title')}</h2>
        <p>{t('terms.section2Body')}</p>
        <h2>{t('terms.section3Title')}</h2>
        <p>{t('terms.section3Body')}</p>
        <h2>{t('terms.section4Title')}</h2>
        <p>{t('terms.section4Body')}</p>
      </section>

      <MarketingFooter />
    </div>
  );
}
