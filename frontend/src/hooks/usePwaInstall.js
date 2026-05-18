import { useCallback, useEffect, useState } from 'react';
import {
  dismissPwaInstall,
  pwaInstallStateKey,
  readPwaInstallState,
  subscribePwaInstall,
  triggerPwaInstall,
} from '../utils/pwaInstallManager';

export function usePwaInstall() {
  const [snap, setSnap] = useState(() => readPwaInstallState());

  useEffect(() => {
    let lastKey = pwaInstallStateKey(readPwaInstallState());

    const sync = () => {
      const next = readPwaInstallState();
      const nextKey = pwaInstallStateKey(next);
      if (nextKey === lastKey) return;
      lastKey = nextKey;
      setSnap(next);
    };

    sync();
    return subscribePwaInstall(sync);
  }, []);

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

export {
  dismissPwaInstall as dismissPwaInstallPrompt,
  isPwaInstallDismissed,
  isPwaInstallDismissed as wasPwaInstallDismissed,
} from '../utils/pwaInstallManager';
