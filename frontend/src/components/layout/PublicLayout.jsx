import { lazy, Suspense } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import './PublicLayout.css';

const Chatbot = lazy(() => import('../public/Chatbot'));

const PublicLayout = ({ children }) => {
  return (
    <div className="public-layout">
      <PublicHeader />
      <main className="public-main">
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
