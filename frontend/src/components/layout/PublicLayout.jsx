import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import PublicPrevNextNav from './PublicPrevNextNav';
import '../../styles/public-a11y.css';
import './PublicLayout.css';

const PublicLayout = ({ children }) => {
  return (
    <div className="public-layout">
      <a href="#public-main-content" className="public-skip-to-content">
        Ruka hadi maudhui kuu
      </a>
      <PublicHeader />
      <main id="public-main-content" className="public-main" tabIndex={-1}>
        <PublicPrevNextNav />
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
