import { lazy, Suspense } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import PublicPrevNextNav from './PublicPrevNextNav';
import '../../styles/public-a11y.css';
import './PublicLayout.css';

const Chatbot = lazy(() => import('../public/Chatbot'));

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
      {/* Floating AI chat – portal-rendered, always visible on all public pages */}
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>
    </div>
  );
};

export default PublicLayout;
