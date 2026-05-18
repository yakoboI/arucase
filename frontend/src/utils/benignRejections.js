/**
 * Detect promise rejections that are safe to ignore (extensions, Vercel toolbar, expected 401s).
 */

export function isBenignUnhandledRejection(reason) {
  if (reason == null) return true;

  const url = reason?.config?.url || reason?.message || '';
  const reqInfo = reason?.reqInfo;

  if (url.includes('ERR_BLOCKED_BY_CLIENT') || reason?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
    return true;
  }

  if (String(url).includes('vercel.live') || String(reason?.message || '').includes('vercel.live')) {
    return true;
  }

  if (String(url).includes('/auth/presence/')) {
    return true;
  }

  if (String(url).includes('/students/bulk-upload')) {
    return true;
  }

  if (String(url).includes('fonts.googleapis.com') || String(url).includes('typekit.net')) {
    return true;
  }

  // Vercel Live / feedback.js (CSP-blocked on production)
  if (
    reason?.httpError === false &&
    (Number(reason?.code) === 403 || reason?.code === '403')
  ) {
    return true;
  }

  if (reason?.code === 403 || String(reason?.code) === '403') {
    return true;
  }

  if (
    reqInfo?.pathPrefix === '/writing' ||
    reqInfo?.path?.includes('/writing') ||
    (reason?.code === 403 && reason?.data?.code === 403 && reason?.data?.error === 'exceptions.UserAuthError')
  ) {
    return true;
  }

  if (reason?.response?.status === 401) {
    return true;
  }

  // Extension/toolbar: plain object rejection (not Error, not axios)
  if (isPlainToolbarRejection(reason)) {
    return true;
  }

  return false;
}

function isPlainToolbarRejection(reason) {
  if (!reason || typeof reason !== 'object') return false;
  if (reason instanceof Error) return false;
  if (reason.response || reason.request) return false;

  const keys = Object.keys(reason);
  if (keys.length === 0) return true;

  const toolbarKeys = new Set([
    'code',
    'data',
    'httpError',
    'httpStatus',
    'message',
    'name',
    'reqInfo',
    'stack',
  ]);

  if (keys.every((k) => toolbarKeys.has(k))) {
    return true;
  }

  return false;
}
