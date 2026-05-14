/**
 * Linear order for public-site Previous / Next navigation.
 * Matches PublicHeader: Shule Yetu → Wanafunzi → Habari, then footer-style pages.
 */
export const PUBLIC_SITE_NAV_ORDER = [
  { path: '/about', label: 'Kuhusu Sisi' },
  { path: '/staff', label: 'Watumishi' },
  { path: '/necta-results', label: 'Matokeo ya NECTA' },
  { path: '/contact', label: 'Mawasiliano' },
  { path: '/admissions', label: 'Udahili' },
  { path: '/admissions/apply', label: 'Maombi ya Udahili' },
  { path: '/student-life', label: 'Maisha ya Wanafunzi' },
  { path: '/student-report', label: 'Ripoti ya Mwanafunzi' },
  { path: '/student-login', label: 'Ripoti za Mwanafunzi' },
  { path: '/student/dashboard', label: 'Dashibodi ya Mwanafunzi' },
  { path: '/school-fee', label: 'Ada ya Shule' },
  { path: '/gallery', label: 'Picha' },
  { path: '/announcements', label: 'Matangazo' },
  { path: '/catholic-education', label: 'Elimu ya Kikatoliki' },
  { path: '/privacy-policy', label: 'Sera ya Faragha' },
];

export const PUBLIC_HOME_PATH = '/';

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
