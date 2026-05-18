/**
 * About Page — content from Admin → Public Pages (slug: about)
 */
import PublicCmsPage from '../../components/public/PublicCmsPage';
import { prepareAboutHtml } from './aboutCms';
import './About.css';

const About = () => (
  <PublicCmsPage
    pageSlug="about"
    pageLabel="Kuhusu Sisi"
    loadingMessage="Inapakia ukurasa wa kuhusu sisi..."
    shellClassName="about-page about-page--immersive"
    innerClassName="about-page__inner"
    showPageHero
    heroVariant="about"
    prepareHtml={(page) => {
      const prepared = prepareAboutHtml(page);
      return { html: prepared.html, variant: prepared.variant };
    }}
  />
);

export default About;
