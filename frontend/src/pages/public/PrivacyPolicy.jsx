/**
 * Privacy Policy — CMS from Admin → Public Pages (slug: privacy)
 */
import { Link } from 'react-router-dom';
import PublicCmsPage from '../../components/public/PublicCmsPage';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => (
  <PublicCmsPage
    pageSlug="privacy"
    pageLabel="Sera ya Faragha"
    loadingMessage="Inapakia sera ya faragha..."
    shellClassName="privacy-policy-page privacy-policy-page--immersive"
    innerClassName="privacy-policy-page__inner"
    hashScroll
    header={
      <header className="content-card policy-surface policy-surface--hero">
        <p className="policy-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
        <h1 className="policy-hero__title">
          <i className="fas fa-shield-alt" aria-hidden /> Sera ya Faragha
        </h1>
      </header>
    }
    footer={
      <div className="policy-back-wrap">
        <Link to="/" className="policy-back-button">
          <i className="fas fa-arrow-left" aria-hidden /> Rudi Mwanzo
        </Link>
      </div>
    }
    cmsClassName="content-card policy-surface policy-surface--prose policy-rich-content"
  />
);

export default PrivacyPolicy;
