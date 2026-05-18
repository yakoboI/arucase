import { lazy, Suspense } from 'react';
import { useShowPublicChatbot } from '../../hooks/useShowPublicChatbot';

const Chatbot = lazy(() => import('./Chatbot'));

/** Single chat instance for all public routes — viewport-fixed via portal */
export default function PublicChatbotLayer() {
  const show = useShowPublicChatbot();
  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <Chatbot />
    </Suspense>
  );
}
