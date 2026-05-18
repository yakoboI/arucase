import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'arucase-pwa-install-dismissed';
const DISMISS_DAYS = 14;

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function wasPwaInstallDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    const ms = DISMISS_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < ms;
  } catch {
    return false;
  }
}

export function dismissPwaInstallPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(wasPwaInstallDismissed);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setIsIos(isIosDevice() && !isStandaloneMode());
    setDismissed(wasPwaInstallDismissed());

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const onDisplayModeChange = () => {
      setIsInstalled(isStandaloneMode());
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', onDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    dismissPwaInstallPrompt();
    setDismissed(true);
  }, []);

  const canInstall = Boolean(deferredPrompt);
  const showIosHint = isIos && !isInstalled && !dismissed;
  const showInstallBanner = !isInstalled && !dismissed && (canInstall || showIosHint);

  return {
    canInstall,
    showIosHint,
    showInstallBanner,
    isInstalled,
    install,
    dismiss,
  };
}
