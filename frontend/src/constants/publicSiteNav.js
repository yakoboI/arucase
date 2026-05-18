/**
 * Single source of truth for public-site header navigation and prev/next tour order.
 */

export const PUBLIC_HOME_ITEM = { path: '/', label: 'Nyumbani', icon: 'fa-home' };

export const PUBLIC_NAV_CATEGORIES = [
  {
    id: 'shule',
    label: 'Shule Yetu',
    icon: 'fa-school',
    items: [
      { path: '/about', label: 'Kuhusu Sisi', icon: 'fa-info-circle' },
      { path: '/staff', label: 'Watumishi', icon: 'fa-users' },
      { path: '/necta-results', label: 'Matokeo ya NECTA', icon: 'fa-certificate' },
      { path: '/contact', label: 'Mawasiliano', icon: 'fa-envelope' },
    ],
  },
  {
    id: 'wanafunzi',
    label: 'Wanafunzi',
    icon: 'fa-graduation-cap',
    items: [
      {
        path: '/admissions',
        label: 'Udahili',
        subLabel: 'Maombi · Admissions',
        icon: 'fa-user-plus',
      },
      { path: '/student-life', label: 'Maisha ya Wanafunzi', icon: 'fa-heart' },
      {
        path: '/student-report',
        label: 'Ripoti za Mwanafunzi',
        icon: 'fa-file-alt',
      },
      { path: '/school-fee', label: 'Ada ya Shule', icon: 'fa-money-bill-wave' },
    ],
  },
  {
    id: 'habari',
    label: 'Habari',
    icon: 'fa-newspaper',
    items: [
      { path: '/gallery', label: 'Picha', icon: 'fa-images' },
      { path: '/announcements', label: 'Matangazo', icon: 'fa-bullhorn' },
    ],
  },
];

export const RIPOTI_MWANAFUNZI_LABEL = 'Ripoti za Mwanafunzi';

function flattenCategoryItems() {
  const flat = [];
  for (const category of PUBLIC_NAV_CATEGORIES) {
    for (const item of category.items) {
      flat.push({ path: item.path, label: item.label });
      if (item.path === '/admissions') {
        flat.push({ path: '/admissions/apply', label: 'Maombi ya Udahili' });
      }
    }
  }
  return flat;
}

/**
 * Linear order for Previous / Next navigation (matches header groups + apply + tail pages).
 */
export const PUBLIC_SITE_NAV_ORDER = [
  ...flattenCategoryItems(),
  { path: '/privacy-policy', label: 'Sera ya Faragha' },
  { path: '/student-login', label: 'Ingia — Ripoti za Mwanafunzi' },
  { path: '/student/dashboard', label: 'Dashibodi ya Mwanafunzi' },
];

export const PUBLIC_HOME_PATH = '/';

export function getCategoryMenuId(categoryId) {
  return `nav-menu-${categoryId}`;
}
