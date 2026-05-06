import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
        <p className="muted">{t('pricing.starterDesc')}</p>
      </section>

      <section className="card">
        <h2>{t('pricing.proTitle')}</h2>
        <p className="muted">{t('pricing.proDesc')}</p>
      </section>
    </div>
  );
}
