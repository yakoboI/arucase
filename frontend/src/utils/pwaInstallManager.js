/**
 * Singleton handler for beforeinstallprompt — only preventDefault when we show custom UI.
 */

const DISMISS_KEY = 'arucase-pwa-install-dismissed';
const DISMISS_DAYS = 14;

let deferredPrompt = null;
let listenerBound = false;
const subscribers = new Set();

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isPwaInstallDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissPwaInstall() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  deferredPrompt = null;
  notify();
}

function shouldCaptureInstallPrompt() {
  if (typeof window === 'undefined') return false;
  if (isStandaloneMode()) return false;
  if (isPwaInstallDismissed()) return false;
  return true;
}

function notify() {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

function bindInstallListeners() {
  if (listenerBound || typeof window === 'undefined') return;
  listenerBound = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    if (!shouldCaptureInstallPrompt()) {
      return;
    }
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });

  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
    notify();
  });
}

export function subscribePwaInstall(listener) {
  bindInstallListeners();
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export async function triggerPwaInstall() {
  const prompt = deferredPrompt;
  if (!prompt || typeof prompt.prompt !== 'function') {
    return { ok: false, outcome: 'unavailable' };
  }
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    deferredPrompt = null;
    notify();
    return { ok: choice?.outcome === 'accepted', outcome: choice?.outcome || 'dismissed' };
  } catch (err) {
    deferredPrompt = null;
    notify();
    return { ok: false, outcome: 'error', error: err };
  }
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
