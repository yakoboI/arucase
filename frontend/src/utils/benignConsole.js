/**
 * Filter known third-party console noise (Vercel Live toolbar, extensions).
 * Import first from main.jsx.
 */

function isBenignRejectionReason(reason) {
  if (reason == null) return true;
  if (reason instanceof Error) return false;
  if (reason.response || reason.request || reason.config?.url) return false;
  if (reason.code === 403 || reason.code === '403' || Number(reason.code) === 403) {
    return true;
  }
  if (reason.httpError === false && (reason.code === 403 || Number(reason.code) === 403)) {
    return true;
  }
  return false;
}

export function installBenignConsoleFilters() {
  const nativeWarn = console.warn.bind(console);
  console.warn = (...args) => {
    const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    if (text.includes('[DEPRECATED]') && text.includes('zustand')) return;
    if (text.includes('Default export is deprecated') && text.includes('zustand')) return;
    nativeWarn(...args);
  };

  const onRejection = (event) => {
    if (isBenignRejectionReason(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener('unhandledrejection', onRejection, true);
}
