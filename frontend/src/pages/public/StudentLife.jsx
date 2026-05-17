/**
 * Student Life Page — CMS from Admin → Public Pages (slug: student-life)
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import './StudentLife.css';

const StudentLife = () => (
  <PublicCmsPage
    pageSlug="student-life"
    pageLabel="Maisha ya Wanafunzi"
    loadingMessage="Inapakia ukurasa wa maisha ya wanafunzi..."
    shellClassName="student-life-page student-life-page--immersive"
    innerClassName="student-life-page__inner"
    header={
      <header className="content-card sl-surface sl-surface--hero">
        <p className="sl-hero__eyebrow">Seminari ya Kikatoliki Arusha</p>
        <h1 className="sl-hero__title">Maisha ya wanafunzi</h1>
      </header>
    }
    cmsClassName="content-card sl-surface sl-surface--cms"
  />
);

export default StudentLife;
