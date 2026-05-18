/**
 * Privacy Policy — CMS from Admin → Public Pages (slug: privacy)
 */
import { Link } from 'react-router-dom';
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { createPublicCmsPrepareHtml } from '../../components/public/PublicCmsPage';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => (
  <PublicCmsPage
    pageSlug="privacy"
    pageLabel="Sera ya Faragha"
    loadingMessage="Inapakia sera ya faragha..."
    shellClassName="privacy-policy-page privacy-policy-page--immersive"
    innerClassName="privacy-policy-page__inner"
    hashScroll
    showPageHero
    heroVariant="privacy"
    prepareHtml={createPublicCmsPrepareHtml('privacy')}
    cmsClassName="policy-cms-grid"
    footer={
      <div className="policy-back-wrap">
        <Link to="/" className="policy-back-button">
          <i className="fas fa-arrow-left" aria-hidden /> Rudi Mwanzo
        </Link>
      </div>
    }
  />
);

export default PrivacyPolicy;
