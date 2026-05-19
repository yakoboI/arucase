import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureToastStyles } from '../../utils/ensureToastStyles';

/** Defer toast CSS on homepage; load immediately on admin/auth routes. */
export default function ToastStylesLoader() {
  const { pathname } = useLocation();
  const isHome = pathname === '/' || pathname === '';

  useEffect(() => {
    if (isHome) {
      const run = () => ensureToastStyles().catch(() => {});
      if (typeof requestIdleCallback !== 'undefined') {
        const id = requestIdleCallback(run, { timeout: 6000 });
        return () => cancelIdleCallback(id);
      }
      const timer = setTimeout(run, 3000);
      return () => clearTimeout(timer);
    }
    ensureToastStyles().catch(() => {});
    return undefined;
  }, [isHome]);

  return null;
}
