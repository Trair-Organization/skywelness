import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingPricingPage() {
  const { t } = useTranslation();

  return (
    <div className="shell marketing">
      <header className="topbar">
        <h1>{t('pricing.title')}</h1>
        <Link className="secondary" to="/">
          {t('pricing.back')}
        </Link>
      </header>

      <section className="card">
        <h2>{t('pricing.starterTitle')}</h2>
        <p className="priceLabel">{t('pricing.starterPrice')}</p>
        <p className="muted">{t('pricing.starterDesc')}</p>
        <ul className="featureList">
          <li>{t('pricing.starterPoint1')}</li>
          <li>{t('pricing.starterPoint2')}</li>
          <li>{t('pricing.starterPoint3')}</li>
        </ul>
      </section>

      <section className="card highlightCard">
        <h2>{t('pricing.proTitle')}</h2>
        <p className="priceLabel">{t('pricing.proPrice')}</p>
        <p className="muted">{t('pricing.proDesc')}</p>
        <ul className="featureList">
          <li>{t('pricing.proPoint1')}</li>
          <li>{t('pricing.proPoint2')}</li>
          <li>{t('pricing.proPoint3')}</li>
        </ul>
      </section>

      <MarketingFooter />
    </div>
  );
}
