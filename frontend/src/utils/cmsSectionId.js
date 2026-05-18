/**
 * Stable DOM ids for CMS section headings (hash links, aria-labelledby).
 */
export function cmsSectionId(title, prefix = 'section', index = 0) {
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug) return `${prefix}-${slug}`;
  return `${prefix}-${index}`;
}
