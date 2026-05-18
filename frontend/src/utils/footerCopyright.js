/** Display name for site copyright footer */
export const FOOTER_COPYRIGHT_NAME = 'Arusha Catholic Seminary';

const LEGACY_COPYRIGHT_PATTERNS = [
  /^jimbo\s+kuu\s+katoliki\s+arusha\.?$/i,
  /^jimbo\s+kuu\s+la\s+arusha\.?$/i,
  /^jimbo\s+kuu\s+katoliki\.?$/i,
  /^seminari\s+ya\s+kikatoliki\s+arusha\.?$/i,
];

/**
 * Normalize admin-stored copyright / school name for the public footer.
 */
export function resolveFooterCopyrightName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return FOOTER_COPYRIGHT_NAME;
  if (LEGACY_COPYRIGHT_PATTERNS.some((re) => re.test(trimmed))) {
    return FOOTER_COPYRIGHT_NAME;
  }
  return trimmed;
}
