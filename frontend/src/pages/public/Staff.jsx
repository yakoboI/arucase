/**
 * Staff Page — intro from Public Pages; directory from Staff Profiles admin.
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { createPublicCmsPrepareHtml } from '../../components/public/PublicCmsPage';
import StaffDirectory from './StaffDirectory';
import './Staff.css';

const Staff = () => (
  <PublicCmsPage
    pageSlug="staff"
    pageLabel="Watumishi"
    loadingMessage="Inapakia ukurasa wa watumishi..."
    shellClassName="staff-page staff-page--immersive"
    innerClassName="staff-page__inner"
    header={<div className="staff-page__bg" aria-hidden />}
    showPageHero
    heroVariant="staff"
    cmsClassName="staff-cms-grid"
    prepareHtml={createPublicCmsPrepareHtml('staff')}
  >
    <StaffDirectory />
  </PublicCmsPage>
);

export default Staff;
