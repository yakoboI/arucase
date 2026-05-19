import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useShowPublicChatbot } from '../../hooks/useShowPublicChatbot';

const Chatbot = lazy(() => import('./Chatbot'));

function isHomePath(pathname) {
  return pathname === '/' || pathname === '';
}

/** Single chat instance for all public routes — viewport-fixed via portal */
export default function PublicChatbotLayer() {
  const show = useShowPublicChatbot();
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!show) {
      setReady(false);
      return undefined;
    }

    const enable = () => setReady(true);

    if (isHomePath(pathname)) {
      // Homepage: defer until interaction or long idle (keeps chat off Lighthouse critical path)
      const events = ['scroll', 'click', 'keydown', 'touchstart'];
      const onInteraction = () => {
        cleanup();
        enable();
      };
      const useIdle = typeof requestIdleCallback !== 'undefined';
      const idleId = useIdle
        ? requestIdleCallback(enable, { timeout: 15000 })
        : setTimeout(enable, 12000);
      events.forEach((ev) => {
        window.addEventListener(ev, onInteraction, { once: true, passive: true });
      });
      const cleanup = () => {
        if (useIdle) cancelIdleCallback(idleId);
        else clearTimeout(idleId);
        events.forEach((ev) => window.removeEventListener(ev, onInteraction));
      };
      return cleanup;
    }

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(enable, { timeout: 10000 });
      return () => {
        cancelIdleCallback(id);
        setReady(false);
      };
    }
    const timer = setTimeout(enable, 4000);
    return () => {
      clearTimeout(timer);
      setReady(false);
    };
  }, [show, pathname]);

  if (!show || !ready) return null;
  return (
    <Suspense fallback={null}>
      <Chatbot />
    </Suspense>
  );
}
