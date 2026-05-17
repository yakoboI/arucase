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
    header={
      <header className="content-card fees-surface fees-surface--hero">
        <p className="fees-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
        <h1 className="fees-hero__title">Ada ya shule</h1>
      </header>
    }
    prepareHtml={(page) => {
      const prepared = prepareSchoolFeeHtml(page);
      return { html: prepared.html, variant: prepared.variant };
    }}
    cmsClassName="content-card fees-surface fees-surface--cms"
  />
);

export default Fees;
