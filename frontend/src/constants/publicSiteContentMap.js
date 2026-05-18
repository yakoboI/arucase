/**
 * Where each public URL gets its content in Admin (sidebar → Public Website).
 * Public Pages CMS = long-form HTML/markdown per slug in public_pages.
 */
export const PUBLIC_SITE_CONTENT_SOURCES = [
  {
    path: '/',
    label: 'Homepage',
    publicPagesSlug: 'homepage',
    note: 'Extra blocks below the hero (quick links, programs, etc.).',
    alsoFrom: [
      { adminPath: '/admin/school-branding', label: 'School name, tagline, rector statement' },
      { adminPath: '/admin/announcements', label: 'News strip' },
      { adminPath: '/admin/gallery', label: 'Photo carousel & gallery preview' },
      { adminPath: '/admin/administrators', label: 'Leadership cards' },
      { adminPath: '/admin/faqs', label: 'FAQ accordion' },
      { adminPath: '/admin/department-contacts', label: 'Phones, emails, footer' },
    ],
  },
  {
    path: '/about',
    label: 'About',
    publicPagesSlug: 'about',
    note: 'Full page body from Public Pages only.',
  },
  {
    path: '/admissions',
    label: 'Admissions',
    publicPagesSlug: 'admissions',
    note: 'Requirements and process text. Apply form is separate (/admissions/apply).',
  },
  {
    path: '/staff',
    label: 'Staff',
    publicPagesSlug: 'staff',
    note: 'Intro text on Public Pages; staff cards from Staff Profiles.',
    alsoFrom: [{ adminPath: '/admin/staff-profiles', label: 'Staff photos & bios' }],
  },
  {
    path: '/student-life',
    label: 'Student life',
    publicPagesSlug: 'student-life',
  },
  {
    path: '/student-report',
    label: 'Student report',
    publicPagesSlug: 'student_report',
  },
  {
    path: '/school-fee',
    label: 'School fees',
    publicPagesSlug: 'school-fee',
  },
  {
    path: '/contact',
    label: 'Contact',
    publicPagesSlug: 'contact',
    note: 'Intro, visit, directions, follow — use Public Pages. Phones/emails/map from Site & Contacts.',
    alsoFrom: [{ adminPath: '/admin/department-contacts', label: 'Site & Contacts' }],
  },
  {
    path: '/privacy-policy',
    label: 'Privacy policy',
    publicPagesSlug: 'privacy',
  },
  {
    path: '/gallery',
    label: 'Gallery',
    publicPagesSlug: null,
    note: 'Photos only — not in Public Pages.',
    alsoFrom: [{ adminPath: '/admin/gallery', label: 'Gallery' }],
  },
  {
    path: '/announcements',
    label: 'Announcements',
    publicPagesSlug: null,
    alsoFrom: [{ adminPath: '/admin/announcements', label: 'Announcements' }],
  },
  {
    path: '/necta-results',
    label: 'NECTA results',
    publicPagesSlug: null,
    alsoFrom: [{ adminPath: '/admin/necta-urls', label: 'NECTA URLs' }],
  },
];

export const PUBLIC_PAGE_SLUG_TO_PATH = {
  homepage: '/',
  about: '/about',
  admissions: '/admissions',
  staff: '/staff',
  'student-life': '/student-life',
  student_report: '/student-report',
  'school-fee': '/school-fee',
  contact: '/contact',
  privacy: '/privacy-policy',
};
