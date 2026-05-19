import { lazy, Suspense, useEffect, useState } from 'react';
import { useShowPublicChatbot } from '../../hooks/useShowPublicChatbot';

const Chatbot = lazy(() => import('./Chatbot'));

/** Single chat instance for all public routes — viewport-fixed via portal */
export default function PublicChatbotLayer() {
  const show = useShowPublicChatbot();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!show) {
      setReady(false);
      return undefined;
    }
    const enable = () => setReady(true);
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
  }, [show]);

  if (!show || !ready) return null;
  return (
    <Suspense fallback={null}>
      <Chatbot />
    </Suspense>
  );
}
