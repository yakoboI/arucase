/**
 * Per-route document SEO: title, description, canonical, hreflang, robots,
 * Open Graph / Twitter (with image dimensions), and BreadcrumbList JSON-LD.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Arusha Catholic Seminary';
const BASE_URL = 'https://www.arushacatholicseminary.co.tz';

/** Default social preview (matches public/icons). */
const DEFAULT_OG_IMAGE = `${BASE_URL}/icons/icon-192x192.png`;
const OG_IMAGE_WIDTH = '192';
const OG_IMAGE_HEIGHT = '192';
const DEFAULT_OG_IMAGE_ALT = 'Arusha Catholic Seminary (ARUCASE) emblem';

const PUBLIC_ROUTE_SEO = {
  '/': {
    title: `${SITE_NAME} (ARUCASE) | St. Thomas Aquinas Seminary Arusha - Best Seminary & O-Level School in Oldonyosambu`,
    description:
      'Arusha Catholic Seminary (ARUCASE, S0171) - St. Thomas Aquinas Seminary Arusha, Seminari ya Jimbo, Jimbo Kuu la Arusha. Located in Oldonyosambu, Arusha, Tanzania. One of the best seminary schools and best O-Level schools in Tanzania. Catholic secondary school offering O-Level and A-Level education, Form I–VI, admissions, staff, NECTA results, fees, and contact.',
    ogImageAlt: 'Arusha Catholic Seminary — St. Thomas Aquinas Seminary, Oldonyosambu',
  },
  '/about': {
    title: `About Us | ${SITE_NAME}`,
    description:
      'Learn about Arusha Catholic Seminary in Oldonyosambu, Tanzania. Explore our mission, history since 1967, and Catholic education in Arusha.',
    ogImageAlt: 'About Arusha Catholic Seminary',
  },
  '/admissions': {
    title: `Admissions | ${SITE_NAME} - Best O-Level School`,
    description:
      'Admission requirements, process, and how to apply to Arusha Catholic Seminary in Oldonyosambu. One of the best seminary schools and best O-Level schools in Arusha, Tanzania.',
    ogImageAlt: 'Admissions at Arusha Catholic Seminary',
  },
  '/admissions/apply': {
    title: `Apply Online | Admissions | ${SITE_NAME}`,
    description:
      'Apply for admission to Arusha Catholic Seminary (ARUCASE) online. Form guidance, required documents, and submission for O-Level and A-Level intake in Oldonyosambu, Arusha, Tanzania.',
    ogImageAlt: 'Online application — Arusha Catholic Seminary',
  },
  '/staff': {
    title: `Staff | ${SITE_NAME}`,
    description: 'Meet the staff and teachers at Arusha Catholic Seminary, Arusha, Tanzania.',
    ogImageAlt: 'Staff at Arusha Catholic Seminary',
  },
  '/student-life': {
    title: `Student Life | ${SITE_NAME}`,
    description: 'Student life, activities, and formation at Arusha Catholic Seminary, Tanzania.',
    ogImageAlt: 'Student life at Arusha Catholic Seminary',
  },
  '/student-report': {
    title: `Student Report | ${SITE_NAME}`,
    description: 'Student report and progress at Arusha Catholic Seminary.',
    ogImageAlt: 'Student reports — Arusha Catholic Seminary',
  },
  '/school-fee': {
    title: `School Fees | ${SITE_NAME}`,
    description: 'School fees structure and payment information for Arusha Catholic Seminary, Arusha, Tanzania.',
    ogImageAlt: 'School fees — Arusha Catholic Seminary',
  },
  '/gallery': {
    title: `Gallery | ${SITE_NAME}`,
    description: 'Photo gallery of Arusha Catholic Seminary campus, events, and activities in Arusha, Tanzania.',
    ogImageAlt: 'Photo gallery — Arusha Catholic Seminary',
  },
  '/announcements': {
    title: `Announcements | ${SITE_NAME}`,
    description: 'News and announcements from Arusha Catholic Seminary, Arusha, Tanzania.',
    ogImageAlt: 'Announcements — Arusha Catholic Seminary',
  },
  '/necta-results': {
    title: `NECTA Results | ${SITE_NAME} S0171`,
    description:
      'NECTA examination results for Arusha Catholic Seminary (S0171). View FTNA, CSEE, and ACSEE results by year on NECTA website.',
    ogImageAlt: 'NECTA results — Arusha Catholic Seminary S0171',
  },
  '/contact': {
    title: `Contact | ${SITE_NAME}`,
    description: 'Contact Arusha Catholic Seminary. Address, phone, email, WhatsApp, and directions in Arusha, Tanzania.',
    ogImageAlt: 'Contact Arusha Catholic Seminary',
  },
  '/privacy-policy': {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: 'Privacy policy for Arusha Catholic Seminary website.',
    ogImageAlt: 'Privacy policy — Arusha Catholic Seminary',
  },
  '/student-login': {
    title: `Student Login | ${SITE_NAME}`,
    description: 'Student portal login for Arusha Catholic Seminary.',
    ogImageAlt: 'Student portal login — Arusha Catholic Seminary',
  },
  '/login': {
    title: `Staff Login | ${SITE_NAME}`,
    description: 'Staff portal login for Arusha Catholic Seminary school management system.',
    ogImageAlt: 'Staff login — Arusha Catholic Seminary',
  },
};

const DEFAULT_DESCRIPTION =
  'Arusha Catholic Seminary (ARUCASE, S0171) - St. Thomas Aquinas Seminary Arusha, Seminari ya Jimbo, Jimbo Kuu la Arusha. Located in Oldonyosambu, Arusha, Tanzania. One of the best seminary schools and best O-Level schools. O-Level and A-Level education.';

function canonicalForPath(pathname) {
  return pathname === '/' ? `${BASE_URL}/` : `${BASE_URL}${pathname}`;
}

function homeItem() {
  return { name: 'Home', item: `${BASE_URL}/` };
}

/** Breadcrumb trails for public indexable routes (matches sitemap). */
function breadcrumbListForPath(pathname) {
  const h = homeItem();
  const trails = {
    '/': [h],
    '/about': [h, { name: 'About', item: `${BASE_URL}/about` }],
    '/admissions': [h, { name: 'Admissions', item: `${BASE_URL}/admissions` }],
    '/admissions/apply': [
      h,
      { name: 'Admissions', item: `${BASE_URL}/admissions` },
      { name: 'Apply online', item: `${BASE_URL}/admissions/apply` },
    ],
    '/staff': [h, { name: 'Staff', item: `${BASE_URL}/staff` }],
    '/student-life': [h, { name: 'Student life', item: `${BASE_URL}/student-life` }],
    '/student-report': [h, { name: 'Student report', item: `${BASE_URL}/student-report` }],
    '/school-fee': [h, { name: 'School fees', item: `${BASE_URL}/school-fee` }],
    '/gallery': [h, { name: 'Gallery', item: `${BASE_URL}/gallery` }],
    '/announcements': [h, { name: 'Announcements', item: `${BASE_URL}/announcements` }],
    '/necta-results': [h, { name: 'NECTA results', item: `${BASE_URL}/necta-results` }],
    '/contact': [h, { name: 'Contact', item: `${BASE_URL}/contact` }],
    '/privacy-policy': [h, { name: 'Privacy policy', item: `${BASE_URL}/privacy-policy` }],
    '/student-login': [h, { name: 'Student login', item: `${BASE_URL}/student-login` }],
  };
  return trails[pathname] || null;
}

function setMeta(nameOrProp, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content ?? '');
}

function syncHreflang(canonicalUrl) {
  document.querySelectorAll('link[data-seo-hreflang="1"]').forEach((node) => node.remove());
  for (const hreflang of ['en', 'x-default']) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.setAttribute('hreflang', hreflang);
    link.href = canonicalUrl;
    link.setAttribute('data-seo-hreflang', '1');
    document.head.appendChild(link);
  }
}

function syncBreadcrumbJsonLd(pathname) {
  const id = 'seo-breadcrumb-jsonld';
  let el = document.getElementById(id);
  const steps = breadcrumbListForPath(pathname);

  if (!steps) {
    if (el) el.remove();
    return;
  }

  const payload = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: s.name,
      item: s.item,
    })),
  };

  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(payload);
}

export default function PageSEO() {
  const { pathname } = useLocation();
  const config = PUBLIC_ROUTE_SEO[pathname];
  const canonicalUrl = canonicalForPath(pathname);
  const title = config?.title || SITE_NAME;
  const description = config?.description || DEFAULT_DESCRIPTION;
  const ogImage = DEFAULT_OG_IMAGE;
  const ogImageAlt = config?.ogImageAlt || DEFAULT_OG_IMAGE_ALT;

  const noIndex =
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/student/dashboard');

  useEffect(() => {
    document.title = title;

    setMeta('description', description);
    const robotsContent = noIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    setMeta('robots', robotsContent);
    setMeta('googlebot', robotsContent);
    setMeta('bingbot', robotsContent);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);

    syncHreflang(canonicalUrl);
    syncBreadcrumbJsonLd(pathname);

    setMeta('og:type', 'website', true);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', ogImage, true);
    setMeta('og:image:width', OG_IMAGE_WIDTH, true);
    setMeta('og:image:height', OG_IMAGE_HEIGHT, true);
    setMeta('og:image:alt', ogImageAlt, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'en_GB', true);

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:url', canonicalUrl);
    setMeta('twitter:image', ogImage);
    setMeta('twitter:image:alt', ogImageAlt);
  }, [pathname, title, description, canonicalUrl, ogImage, ogImageAlt, noIndex]);

  return null;
}
