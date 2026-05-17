/** Legacy admin/API slugs → canonical slug used by public routes */
const PUBLIC_PAGE_SLUG_ALIASES = {
  fees: 'school-fee',
  student_life: 'student-life',
};

function resolvePublicPageSlug(pageName) {
  const key = String(pageName || '').trim();
  return PUBLIC_PAGE_SLUG_ALIASES[key] || key;
}

module.exports = {
  PUBLIC_PAGE_SLUG_ALIASES,
  resolvePublicPageSlug,
};
