import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MarketingContactForm } from '../components/MarketingContactForm';
import { MarketingFooter } from '../components/MarketingFooter';

export function MarketingHomePage() {
  const { t } = useTranslation();

  return (
    <div className="shell marketing">
      <header className="marketingHero">
        <p className="badge">{t('marketing.badge')}</p>
        <h1>{t('marketing.title')}</h1>
        <p className="muted">{t('marketing.subtitle')}</p>
        <div className="statRow">
          <span>{t('marketing.stat1')}</span>
          <span>{t('marketing.stat2')}</span>
          <span>{t('marketing.stat3')}</span>
        </div>
        <div className="heroActions">
          <Link className="cta" to="/login">
            {t('marketing.login')}
          </Link>
          <a className="secondary" href="#features">
            {t('marketing.featuresCta')}
          </a>
        </div>
      </header>

      <section id="features" className="card">
        <h2>{t('marketing.featuresTitle')}</h2>
        <ul className="featureList">
          <li>{t('marketing.feature1')}</li>
          <li>{t('marketing.feature2')}</li>
          <li>{t('marketing.feature3')}</li>
        </ul>
      </section>

      <section className="card">
        <h2>{t('marketing.whyTitle')}</h2>
        <div className="metricsGrid">
          <article className="metricCard">
            <h3>{t('marketing.whyCard1Title')}</h3>
            <p className="muted">{t('marketing.whyCard1Body')}</p>
          </article>
          <article className="metricCard">
            <h3>{t('marketing.whyCard2Title')}</h3>
            <p className="muted">{t('marketing.whyCard2Body')}</p>
          </article>
          <article className="metricCard">
            <h3>{t('marketing.whyCard3Title')}</h3>
            <p className="muted">{t('marketing.whyCard3Body')}</p>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>{t('marketing.panelsTitle')}</h2>
        <p className="muted">{t('marketing.panelsSubtitle')}</p>
        <div className="panelLinks">
          <Link className="link" to="/pricing">
            {t('marketing.pricingLink')}
          </Link>
          <Link className="link" to="/contact">
            {t('marketing.contactLink')}
          </Link>
          <Link className="link" to="/club/dashboard">
            {t('marketing.clubPanelLink')}
          </Link>
          <Link className="link" to="/trainer/dashboard">
            {t('marketing.trainerPanelLink')}
          </Link>
        </div>
      </section>

      <section className="card" id="contact">
        <h2>{t('marketing.contactBlockTitle')}</h2>
        <p className="muted">{t('marketing.contactBlockBody')}</p>
        <MarketingContactForm />
      </section>

      <MarketingFooter />
    </div>
  );
}
