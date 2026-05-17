/**
 * About Page — content from Admin → Public Pages (slug: about)
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import './About.css';

const About = () => (
  <PublicCmsPage
    pageSlug="about"
    pageLabel="Kuhusu Sisi"
    loadingMessage="Inapakia ukurasa wa kuhusu sisi..."
    shellClassName="about-page about-page--immersive"
    innerClassName="about-page__inner"
    cmsClassName="content-card about-cms-body"
  />
);

export default About;
