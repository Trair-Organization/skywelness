import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function MarketingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="marketingFooter">
      <div className="footerGrid">
        <section>
          <h3>{t('footer.productTitle')}</h3>
          <p>{t('footer.productBody')}</p>
          <p className="muted">{t('footer.company')}</p>
        </section>

        <section>
          <h3>{t('footer.linksTitle')}</h3>
          <div className="footerLinks">
            <Link to="/pricing">{t('footer.pricing')}</Link>
            <Link to="/contact">{t('footer.contact')}</Link>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
          </div>
        </section>

        <section>
          <h3>{t('footer.reachTitle')}</h3>
          <p>
            <a href="mailto:info@wellnessclub.com">info@wellnessclub.com</a>
          </p>
          <p>
            <a href="https://instagram.com/wellnessclub.tr" target="_blank" rel="noreferrer">
              @wellnessclub.tr
            </a>
          </p>
        </section>
      </div>
    </footer>
  );
}
