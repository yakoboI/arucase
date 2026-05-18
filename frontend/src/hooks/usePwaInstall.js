import { useCallback, useSyncExternalStore } from 'react';
import {
  dismissPwaInstall,
  getDeferredInstallPrompt,
  isIosDevice,
  isPwaInstallDismissed,
  subscribePwaInstall,
  triggerPwaInstall,
} from '../utils/pwaInstallManager';

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function getSnapshot() {
  return {
    dismissed: isPwaInstallDismissed(),
    installed: isStandaloneMode(),
    canInstall: Boolean(getDeferredInstallPrompt()),
    isIos: isIosDevice() && !isStandaloneMode(),
  };
}

const SERVER_SNAPSHOT = {
  dismissed: false,
  installed: false,
  canInstall: false,
  isIos: false,
};

export function usePwaInstall() {
  const snap = useSyncExternalStore(subscribePwaInstall, getSnapshot, () => SERVER_SNAPSHOT);

  const install = useCallback(async () => {
    const result = await triggerPwaInstall();
    return result.ok;
  }, []);

  const dismiss = useCallback(() => {
    dismissPwaInstall();
  }, []);

  const showIosHint = snap.isIos && !snap.installed && !snap.dismissed;
  const showInstallBanner =
    !snap.installed && !snap.dismissed && (snap.canInstall || showIosHint);

  return {
    canInstall: snap.canInstall,
    showIosHint,
    showInstallBanner,
    isInstalled: snap.installed,
    install,
    dismiss,
  };
}

export { dismissPwaInstall as dismissPwaInstallPrompt, isPwaInstallDismissed as wasPwaInstallDismissed };
