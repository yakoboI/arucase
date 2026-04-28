/**
 * Updates document title, meta description, canonical, Open Graph, and Twitter Card per route for SEO.
 * Helps search engines and social shares show the correct title/description/URL for each page.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Arusha Catholic Seminary';
const BASE_URL = 'https://www.arushacatholicseminary.co.tz';
const DEFAULT_IMAGE = `${BASE_URL}/icons/icon-192x192.png`;

const PUBLIC_ROUTE_SEO = {
  '/': {
    title: `${SITE_NAME} (ARUCASE) | St. Thomas Aquinas Seminary Arusha - Best Seminary & O-Level School in Oldonyosambu`,
    description: 'Arusha Catholic Seminary (ARUCASE, S0171) - St. Thomas Aquinas Seminary Arusha, Seminari ya Jimbo, Jimbo Kuu la Arusha. Located in Oldonyosambu, Arusha, Tanzania. One of the best seminary schools and best O-Level schools in Tanzania. Catholic secondary school offering O-Level and A-Level education, Form I–VI, admissions, staff, NECTA results, fees, and contact.',
  },
  '/about': {
    title: `About Us | ${SITE_NAME}`,
    description: 'Learn about Arusha Catholic Seminary in Oldonyosambu, Tanzania. Explore our mission, history since 1967, and Catholic education in Arusha.',
  },
  '/admissions': {
    title: `Admissions | ${SITE_NAME} - Best O-Level School`,
    description: 'Admission requirements, process, and how to apply to Arusha Catholic Seminary in Oldonyosambu. One of the best seminary schools and best O-Level schools in Arusha, Tanzania.',
  },
  '/staff': {
    title: `Staff | ${SITE_NAME}`,
    description: 'Meet the staff and teachers at Arusha Catholic Seminary, Arusha, Tanzania.',
  },
  '/student-life': {
    title: `Student Life | ${SITE_NAME}`,
    description: 'Student life, activities, and formation at Arusha Catholic Seminary, Tanzania.',
  },
  '/student-report': {
    title: `Student Report | ${SITE_NAME}`,
    description: 'Student report and progress at Arusha Catholic Seminary.',
  },
  '/school-fee': {
    title: `School Fees | ${SITE_NAME}`,
    description: 'School fees structure and payment information for Arusha Catholic Seminary, Arusha, Tanzania.',
  },
  '/gallery': {
    title: `Gallery | ${SITE_NAME}`,
    description: 'Photo gallery of Arusha Catholic Seminary campus, events, and activities in Arusha, Tanzania.',
  },
  '/announcements': {
    title: `Announcements | ${SITE_NAME}`,
    description: 'News and announcements from Arusha Catholic Seminary, Arusha, Tanzania.',
  },
  '/necta-results': {
    title: `NECTA Results | ${SITE_NAME} S0171`,
    description: 'NECTA examination results for Arusha Catholic Seminary (S0171). View FTNA, CSEE, and ACSEE results by year on NECTA website.',
  },
  '/contact': {
    title: `Contact | ${SITE_NAME}`,
    description: 'Contact Arusha Catholic Seminary. Address, phone, email, WhatsApp, and directions in Arusha, Tanzania.',
  },
  '/privacy-policy': {
    title: `Privacy Policy | ${SITE_NAME}`,
    description: 'Privacy policy for Arusha Catholic Seminary website.',
  },
  '/student-login': {
    title: `Student Login | ${SITE_NAME}`,
    description: 'Student portal login for Arusha Catholic Seminary.',
  },
  '/login': {
    title: `Staff Login | ${SITE_NAME}`,
    description: 'Staff portal login for Arusha Catholic Seminary school management system.',
  },
};

function setMeta(nameOrProp, content, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content || '');
}

export default function PageSEO() {
  const { pathname } = useLocation();
  const config = PUBLIC_ROUTE_SEO[pathname];
  const canonicalUrl = pathname === '/' ? BASE_URL + '/' : `${BASE_URL}${pathname}`;
  const title = config?.title || SITE_NAME;
  const description = config?.description || 'Arusha Catholic Seminary (ARUCASE, S0171) - St. Thomas Aquinas Seminary Arusha, Seminari ya Jimbo, Jimbo Kuu la Arusha. Located in Oldonyosambu, Arusha, Tanzania. One of the best seminary schools and best O-Level schools. O-Level and A-Level education.';

  useEffect(() => {
    document.title = title;

    setMeta('description', description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);

    // Open Graph (Facebook, LinkedIn, etc.)
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:image', DEFAULT_IMAGE, true);

    // Twitter Card
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:url', canonicalUrl);
    setMeta('twitter:image', DEFAULT_IMAGE);
  }, [pathname, title, description, canonicalUrl]);

  return null;
}
