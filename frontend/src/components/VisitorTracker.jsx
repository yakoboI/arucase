import { useEffect, useRef } from 'react';
import { publicAPI } from '../services/public';

/**
 * Visitor Tracker Component
 * Tracks visitors once per session when any public page loads
 */
const VisitorTracker = () => {
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per session
    if (hasTracked.current) return;
    
    // Track once per day (Africa/Dar_es_Salaam timezone) within current browser session/tab
    const todayKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const sessionKey = `visitor_tracked_${todayKey}`;
    if (sessionStorage.getItem(sessionKey)) {
      hasTracked.current = true;
      return;
    }

    // Track visitor
    const trackVisitor = async () => {
      try {
        await publicAPI.trackVisitor();
        // Mark as tracked in session storage
        sessionStorage.setItem(sessionKey, 'true');
        hasTracked.current = true;
        // Notify listeners (e.g., footer stats) to refresh immediately.
        window.dispatchEvent(new CustomEvent('visitor:tracked'));
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.error('Failed to track visitor:', error);
      }
    };

    // Small delay to ensure page is loaded
    const timer = setTimeout(trackVisitor, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
};

export default VisitorTracker;

