/**
 * Fees Page — CMS from Admin → Public Pages (slug: school-fee)
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { prepareSchoolFeeHtml } from './feesCms';
import './Fees.css';

const Fees = () => (
  <PublicCmsPage
    pageSlug="school-fee"
    pageLabel="Ada ya Shule"
    loadingMessage="Inapakia ukurasa wa ada…"
    shellClassName="fees-page fees-page--immersive"
    innerClassName="fees-page__inner"
    header={<div className="fees-page__bg" aria-hidden />}
    showPageHero
    heroVariant="fees"
    prepareHtml={(page) => {
      const prepared = prepareSchoolFeeHtml(page);
      return { html: prepared.html, variant: prepared.variant };
    }}
    cmsClassName="content-card fees-surface fees-surface--cms"
  />
);

export default Fees;
