/** Published HTML from public_pages API row */
export function getPageHtml(page) {
  if (!page) return '';
  return String(page.html_content || page.content || '').trim();
}

export function hasPublishedPage(page) {
  return getPageHtml(page).length > 0;
}

/** Read a website_settings field with no marketing default */
export function settingValue(settings, key) {
  const v = settings?.[key];
  if (v == null) return '';
  return String(v).trim();
}
