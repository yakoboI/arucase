/**
 * Network Status Banner - Non-intrusive indicator when offline only.
 * Slow / save-data connections no longer show a banner (previously a scrolling-images hint).
 */
import { useState, useEffect } from 'react';
import { isOnline, monitorNetworkChanges } from '../../utils/networkUtils';
import './NetworkStatusBanner.css';

const NetworkStatusBanner = () => {
  const [status, setStatus] = useState(null); // null | 'offline'
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const updateStatus = () => {
      setStatus(isOnline() ? null : 'offline');
    };

    updateStatus();

    const cleanup = monitorNetworkChanges(updateStatus);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      cleanup();
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  useEffect(() => {
    if (!status) {
      setVisible(true);
      return undefined;
    }

    setVisible(true);
    const timer = setInterval(() => {
      setVisible((prev) => !prev);
    }, 2000);

    return () => clearInterval(timer);
  }, [status]);

  if (!status || !visible) return null;

  return (
    <div
      className={`network-status-banner network-status-banner--${status}`}
      role="status"
      aria-live="polite"
    >
      <i className="fas fa-wifi network-status-banner__icon" aria-hidden />
      <span>Hakuna muunganisho wa intaneti. Baadhi ya vipengele vinaweza visifanye kazi. Tafadhali angalia mtandao kisha ujaribu tena.</span>
    </div>
  );
};

export default NetworkStatusBanner;
