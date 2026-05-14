/**
 * Turn DB "markdown-ish" student-report copy into HTML for a multi-card layout.
 * If content already looks like HTML, caller should use it as-is instead.
 */

function escapeHtml(text) {
  if (text == null) return '';
  const s = String(text);
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}

export function looksLikeMarkdownPlain(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  if (/<[a-z][\s\S]*?>/i.test(t)) return false;
  return /^##\s/m.test(t);
}

function hasRealHtml(s) {
  return s && /<[a-z][\s\S]*?>/i.test(String(s).trim());
}

function bodyToHtml(body) {
  const b = String(body || '').trim();
  if (!b) return '';

  const lines = b.split(/\r?\n/);
  let html = '';
  let inUl = false;
  const closeUl = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeUl();
      continue;
    }
    if (line.startsWith('- ')) {
      if (!inUl) {
        html += '<ul class="student-report-md-list">';
        inUl = true;
      }
      html += `<li>${escapeHtml(line.slice(2).trim())}</li>`;
    } else {
      closeUl();
      html += `<p class="student-report-md-p">${escapeHtml(line)}</p>`;
    }
  }
  closeUl();
  return html;
}

/**
 * @param {string} markdown
 * @returns {string} HTML (unsanitized — sanitize at call site)
 */
export function markdownReportToGridHtml(markdown) {
  const chunks = String(markdown || '')
    .trim()
    .split(/^##\s+/m);
  const parts = chunks[0] === '' ? chunks.slice(1) : chunks;

  const sections = parts
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const nl = chunk.indexOf('\n');
      const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
      const body = nl === -1 ? '' : chunk.slice(nl + 1).trim();
      if (!title) return '';

      if (/^ripoti za wanafunzi$/i.test(title) && body.length < 120) {
        return '';
      }

      const bodyHtml = bodyToHtml(body);
      return `<section class="student-report-md-card"><h2 class="student-report-md-card__title">${escapeHtml(title)}</h2><div class="student-report-md-card__body">${bodyHtml}</div></section>`;
    })
    .filter(Boolean);

  if (sections.length === 0) return '';

  return `<div class="student-report-md-outer"><div class="student-report-md-grid">${sections.join('')}</div></div>`;
}

/**
 * @param {{ html_content?: string, content?: string } | null} page
 * @returns {{ html: string, variant: 'grid' | 'prose' }}
 */
export function prepareStudentReportHtml(page) {
  if (!page) return { html: '', variant: 'prose' };

  const rawHtml = String(page.html_content || '').trim();
  const rawPlain = String(page.content || '').trim();

  if (hasRealHtml(rawHtml)) {
    return { html: rawHtml, variant: 'prose' };
  }
  if (looksLikeMarkdownPlain(rawHtml)) {
    const grid = markdownReportToGridHtml(rawHtml);
    if (grid) return { html: grid, variant: 'grid' };
  }
  if (hasRealHtml(rawPlain)) {
    return { html: rawPlain, variant: 'prose' };
  }
  if (looksLikeMarkdownPlain(rawPlain)) {
    const grid = markdownReportToGridHtml(rawPlain);
    if (grid) return { html: grid, variant: 'grid' };
  }

  const fallback = rawHtml || rawPlain;
  if (looksLikeMarkdownPlain(fallback)) {
    return {
      html: `<div class="student-report-md-fallback"><pre>${escapeHtml(fallback)}</pre></div>`,
      variant: 'prose',
    };
  }
  return { html: fallback, variant: 'prose' };
}
