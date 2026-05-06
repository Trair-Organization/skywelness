import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingPrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="shell marketing">
      <header className="topbar">
        <h1>{t('privacy.title')}</h1>
        <Link className="secondary" to="/">
          {t('privacy.back')}
        </Link>
      </header>

      <section className="card legal">
        <p>{t('privacy.intro')}</p>
        <h2>{t('privacy.section1Title')}</h2>
        <p>{t('privacy.section1Body')}</p>
        <h2>{t('privacy.section2Title')}</h2>
        <p>{t('privacy.section2Body')}</p>
        <h2>{t('privacy.section3Title')}</h2>
        <p>{t('privacy.section3Body')}</p>
        <h2>{t('privacy.section4Title')}</h2>
        <p>{t('privacy.section4Body')}</p>
      </section>

      <MarketingFooter />
    </div>
  );
}
