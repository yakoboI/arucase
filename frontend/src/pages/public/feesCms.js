/**
 * Prepare school-fee CMS copy for the public page: one card per ## section (markdown)
 * or one card per top-level H2 block (HTML). Falls back to a single prose card when
 * splitting does not apply.
 */
import DOMPurify from 'dompurify';
import {
  looksLikeMarkdownPlain,
  escapeHtml,
  hasRealHtml,
  applyBoldMarkers,
} from '../../utils/publicCmsMarkdown';

const STRIPES = [
  'fees-surface--stripe-navy',
  'fees-surface--stripe-slate',
  'fees-surface--stripe-teal',
  'fees-surface--stripe-gold',
];

function bodyMarkdownToFeesHtml(body) {
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
        html += '<ul class="fees-chunk__list">';
        inUl = true;
      }
      html += `<li>${applyBoldMarkers(escapeHtml(line.slice(2).trim()))}</li>`;
    } else {
      closeUl();
      html += `<p class="fees-chunk__text">${applyBoldMarkers(escapeHtml(line))}</p>`;
    }
  }
  closeUl();
  return html;
}

function isContactishTitle(title) {
  const t = String(title || '').trim();
  return /mawasiliano/i.test(t);
}

/**
 * @param {string} markdown
 * @returns {string} HTML (unsanitized fragment — sanitize at call site)
 */
function markdownFeesToGridHtml(markdown) {
  const chunks = String(markdown || '')
    .trim()
    .split(/^##\s+/m);
  const parts = chunks[0] === '' ? chunks.slice(1) : chunks;

  const sections = parts
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, idx) => {
      const nl = chunk.indexOf('\n');
      const title = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
      const body = nl === -1 ? '' : chunk.slice(nl + 1).trim();
      if (!title) return '';

      const bodyHtml = bodyMarkdownToFeesHtml(body);
      const stripe = STRIPES[idx % STRIPES.length];
      const spanFull = isContactishTitle(title) ? ' fees-surface--span-full' : '';
      const hId = `fees-cms-md-${idx}`;

      return `<section class="content-card fees-surface fees-surface--chunk ${stripe}${spanFull}" aria-labelledby="${hId}"><div class="fees-card__head"><span class="fees-card__icon" aria-hidden="true"><i class="fas fa-file-alt"></i></span><h2 id="${hId}" class="fees-card__title">${escapeHtml(title)}</h2></div><div class="fees-md-split__body">${bodyHtml}</div></section>`;
    })
    .filter(Boolean);

  if (sections.length === 0) return '';
  return `<div class="fees-grid public-cms-grid">${sections.join('')}</div>`;
}

/**
 * Split sanitized HTML into sibling groups separated by direct child H2.
 * @param {string} html
 * @returns {string[] | null} inner HTML per card, or null if no H2 to split on
 */
function splitSanitizedHtmlByH2(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let scope = doc.body;

  const directChildren = Array.from(scope.children);
  const hasDirectH2 = directChildren.some((el) => el.tagName === 'H2');

  if (!hasDirectH2 && directChildren.length === 1) {
    const inner = directChildren[0];
    if (inner && Array.from(inner.children).some((el) => el.tagName === 'H2')) {
      scope = inner;
    }
  }

  const nodes = Array.from(scope.childNodes).filter((n) => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent || '').trim() !== '';
    return true;
  });

  const groups = [];
  let current = [];

  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H2') {
      if (current.length) groups.push(current);
      current = [node];
    } else {
      current.push(node);
    }
  }
  if (current.length) groups.push(current);

  const hasH2 = groups.some((g) => g.some((n) => n.nodeType === Node.ELEMENT_NODE && n.tagName === 'H2'));
  if (!hasH2) return null;

  return groups.map((groupNodes) => {
    const wrap = doc.createElement('div');
    groupNodes.forEach((n) => wrap.appendChild(n.cloneNode(true)));
    return wrap.innerHTML;
  });
}

function wrapHtmlSplitSection(innerHtml, index) {
  const stripe = STRIPES[index % STRIPES.length];
  const doc = new DOMParser().parseFromString(`<div>${innerHtml}</div>`, 'text/html');
  const firstH2 = doc.body.querySelector('h2');
  let spanFull = '';
  if (firstH2 && isContactishTitle(firstH2.textContent || '')) {
    spanFull = ' fees-surface--span-full';
  }
  return `<section class="content-card fees-surface fees-surface--chunk fees-html-split ${stripe}${spanFull}">${innerHtml}</section>`;
}

/**
 * @param {{ html_content?: string, content?: string } | null} page
 * @returns {{ html: string, variant: 'grid' | 'prose' }}
 */
export function prepareSchoolFeeHtml(page) {
  if (!page) return { html: '', variant: 'prose' };

  const rawHtml = String(page.html_content || '').trim();
  const rawPlain = String(page.content || '').trim();

  const tryMarkdown = (src) => {
    if (!looksLikeMarkdownPlain(src)) return null;
    const grid = markdownFeesToGridHtml(src);
    if (!grid) return null;
    return { html: DOMPurify.sanitize(grid), variant: 'grid' };
  };

  if (!hasRealHtml(rawHtml) && !hasRealHtml(rawPlain)) {
    const md = tryMarkdown(rawHtml) || tryMarkdown(rawPlain);
    if (md) return md;
    const fallback = rawHtml || rawPlain;
    if (fallback) return { html: DOMPurify.sanitize(fallback), variant: 'prose' };
    return { html: '', variant: 'prose' };
  }

  const htmlSrc = hasRealHtml(rawHtml) ? rawHtml : rawPlain;
  if (htmlSrc) {
    const clean = DOMPurify.sanitize(htmlSrc);
    const parts = splitSanitizedHtmlByH2(clean);
    if (parts && parts.length > 0) {
      const wrapped = parts.map((inner, i) => wrapHtmlSplitSection(inner, i)).join('');
      return { html: DOMPurify.sanitize(`<div class="fees-grid public-cms-grid">${wrapped}</div>`), variant: 'grid' };
    }
    return { html: clean, variant: 'prose' };
  }

  const md = tryMarkdown(rawHtml) || tryMarkdown(rawPlain);
  if (md) return md;

  const fallback = rawHtml || rawPlain;
  return { html: DOMPurify.sanitize(fallback), variant: 'prose' };
}
