/**
 * Prev/next tour — re-exported from publicSiteNav (single source of truth).
 */
import { PUBLIC_SITE_NAV_ORDER } from './publicSiteNav';

export {
  PUBLIC_SITE_NAV_ORDER,
  PUBLIC_HOME_PATH,
  PUBLIC_NAV_CATEGORIES,
  PUBLIC_HOME_ITEM,
  RIPOTI_MWANAFUNZI_LABEL,
  getCategoryMenuId,
} from './publicSiteNav';

/**
 * @param {string} pathname
 * @returns {number} index in PUBLIC_SITE_NAV_ORDER, or -1 if not part of the tour
 */
export function getPublicNavIndex(pathname) {
  const normalized = (pathname.replace(/\/$/, '') || '/').toLowerCase();
  const paths = PUBLIC_SITE_NAV_ORDER.map((e) => e.path);
  const lowerPaths = paths.map((p) => p.toLowerCase());
  const exact = lowerPaths.indexOf(normalized);
  if (exact !== -1) return exact;

  let bestIdx = -1;
  let bestLen = -1;
  for (let k = 0; k < paths.length; k++) {
    const p = paths[k];
    if (p === '/') continue;
    if (normalized.startsWith(p.toLowerCase() + '/')) {
      if (p.length > bestLen) {
        bestLen = p.length;
        bestIdx = k;
      }
    }
  }
  return bestIdx;
}
