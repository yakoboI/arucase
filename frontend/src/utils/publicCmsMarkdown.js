/**
 * Shared markdown parsing for public CMS pages (no DOM / DOMPurify).
 */

export function escapeHtml(text) {
  if (text == null) return '';
  const s = String(text);
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}

export function applyBoldMarkers(safeLine) {
  return safeLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function looksLikeMarkdownPlain(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  if (/<[a-z][\s\S]*?>/i.test(t)) return false;
  return /^#{2,3}\s/m.test(t);
}

export function hasRealHtml(s) {
  return s && /<[a-z][\s\S]*?>/i.test(String(s).trim());
}

/**
 * @param {string} markdown
 * @param {{ splitH3?: boolean }} options
 */
export function parseMarkdownSections(markdown, { splitH3 = true } = {}) {
  const sections = [];
  let current = null;

  for (const raw of String(markdown || '').split(/\r?\n/)) {
    const h2 = raw.match(/^##\s+(.+)$/);
    const h3 = raw.match(/^###\s+(.+)$/);
    if (h2 || (h3 && splitH3)) {
      if (current) sections.push(current);
      current = { title: (h2 || h3)[1].trim(), level: h2 ? 2 : 3, bodyLines: [] };
      continue;
    }
    if (h3 && !splitH3 && current) {
      current.bodyLines.push(raw);
      continue;
    }
    if (!current) {
      if (raw.trim()) current = { title: '', level: 2, bodyLines: [raw], preamble: true };
      continue;
    }
    current.bodyLines.push(raw);
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * @param {string} body
 * @param {{ listClass: string, textClass: string, h3Class?: string }} classes
 */
export function bodyMarkdownToHtml(body, classes) {
  const b = String(body || '').trim();
  if (!b) return '';

  const lines = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let html = '';
  let inUl = false;
  const closeUl = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
  };

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      closeUl();
      html += `<h3 class="${classes.h3Class || 'policy-chunk__h3'}">${applyBoldMarkers(escapeHtml(h3[1].trim()))}</h3>`;
      continue;
    }
    if (line.startsWith('- ')) {
      if (!inUl) {
        html += `<ul class="${classes.listClass}">`;
        inUl = true;
      }
      html += `<li>${applyBoldMarkers(escapeHtml(line.slice(2).trim()))}</li>`;
    } else {
      closeUl();
      html += `<p class="${classes.textClass}">${applyBoldMarkers(escapeHtml(line))}</p>`;
    }
  }
  closeUl();
  return html;
}
