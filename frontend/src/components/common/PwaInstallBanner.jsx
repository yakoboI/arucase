import { usePwaInstall } from '../../hooks/usePwaInstall';
import './PwaInstallBanner.css';

const PwaInstallBanner = () => {
  const { canInstall, showIosHint, showInstallBanner, install, dismiss } = usePwaInstall();

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label="Sakinisha programu ya ARUCASE"
    >
      <div className="pwa-install-banner__inner">
        <div className="pwa-install-banner__icon" aria-hidden>
          <i className="fas fa-mobile-screen-button" />
        </div>
        <div className="pwa-install-banner__text">
          <p className="pwa-install-banner__title">Sakinisha ARUCASE kwenye simu</p>
          {showIosHint ? (
            <p className="pwa-install-banner__hint">
              Safari: gusa <strong>Shiriki</strong> (
              <i className="fas fa-arrow-up-from-bracket pwa-install-banner__share-icon" aria-hidden />
              ), kisha <strong>Ongeza kwenye Skrini ya Kwanza</strong>.
            </p>
          ) : (
            <p className="pwa-install-banner__hint">
              Pakua tovuti kama programu — ufikiaji wa haraka bila kivinjari kila wakati.
            </p>
          )}
        </div>
        <div className="pwa-install-banner__actions">
          {canInstall && (
            <button type="button" className="pwa-install-banner__install" onClick={install}>
              Sakinisha
            </button>
          )}
          <button
            type="button"
            className="pwa-install-banner__dismiss"
            onClick={dismiss}
            aria-label="Funga"
          >
            <i className="fas fa-times" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
