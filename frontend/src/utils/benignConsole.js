/**
 * Filter known third-party console noise (Vercel Live toolbar, extensions).
 * Import first from main.jsx. Early handler: public/js/benign-rejections.js
 */

import { isBenignUnhandledRejection } from './benignRejections';

export function installBenignConsoleFilters() {
  const nativeWarn = console.warn.bind(console);
  console.warn = (...args) => {
    const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    if (text.includes('[DEPRECATED]') && text.includes('zustand')) return;
    if (text.includes('Default export is deprecated') && text.includes('zustand')) return;
    nativeWarn(...args);
  };

  const onRejection = (event) => {
    if (isBenignUnhandledRejection(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  window.addEventListener('unhandledrejection', onRejection, true);
}
