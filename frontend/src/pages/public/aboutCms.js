/**
 * Prepare about CMS copy: one card per ## or ### section (markdown) or per H2/H3 (HTML).
 */
import DOMPurify from 'dompurify';
import { cmsSectionId } from '../../utils/cmsSectionId';
import {
  looksLikeMarkdownPlain,
  escapeHtml,
  applyBoldMarkers,
  hasRealHtml,
} from '../../utils/publicCmsMarkdown';

const STRIPES = [
  'about-card--stripe-blue',
  'about-card--stripe-slate',
  'about-card--stripe-green',
  'about-card--stripe-violet',
  'about-card--stripe-navy',
  'about-card--stripe-gold',
];

const ICONS = ['fa-info-circle', 'fa-book', 'fa-heart', 'fa-users', 'fa-star', 'fa-graduation-cap'];

function bodyMarkdownToAboutHtml(body, { valuesGrid = false } = {}) {
  const b = String(body || '').trim();
  if (!b) return '';

  const lines = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => l.startsWith('- '));
  const allBullets = bulletLines.length > 0 && bulletLines.length === lines.length;

  if (valuesGrid && allBullets) {
    const items = bulletLines.map((line) => {
      const inner = applyBoldMarkers(escapeHtml(line.slice(2).trim()));
      return `<article class="about-card about-card--compact about-card--stripe-slate"><p class="about-card__text">${inner}</p></article>`;
    });
    return `<div class="about-values-cards public-cms-grid">${items.join('')}</div>`;
  }

  let html = '';
  let inUl = false;
  const closeUl = () => {
    if (inUl) {
      html += '</ul>';
      inUl = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!inUl) {
        html += '<ul class="about-card__list">';
        inUl = true;
      }
      html += `<li>${applyBoldMarkers(escapeHtml(line.slice(2).trim()))}</li>`;
    } else {
      closeUl();
      html += `<p class="about-card__text">${applyBoldMarkers(escapeHtml(line))}</p>`;
    }
  }
  closeUl();
  return html;
}

function cardSection(title, bodyHtml, idx, { compact = false } = {}) {
  const stripe = STRIPES[idx % STRIPES.length];
  const icon = ICONS[idx % ICONS.length];
  const hId = cmsSectionId(title, 'about-cms', idx);
  const safeTitle = escapeHtml(title);
  const compactClass = compact ? ' about-card--compact' : '';
  return (
    `<section class="about-card ${stripe}${compactClass}" aria-labelledby="${hId}">` +
    `<div class="about-card__head">` +
    `<span class="about-card__icon" aria-hidden="true"><i class="fas ${icon}"></i></span>` +
    `<h2 id="${hId}" class="about-card__title">${safeTitle}</h2>` +
    `</div>` +
    `<div class="about-card__cms-body">${bodyHtml}</div>` +
    `</section>`
  );
}

function parseMarkdownSections(markdown) {
  const sections = [];
  let current = null;

  for (const raw of String(markdown || '').split(/\r?\n/)) {
    const h2 = raw.match(/^##\s+(.+)$/);
    const h3 = raw.match(/^###\s+(.+)$/);
    if (h2 || h3) {
      if (current) sections.push(current);
      current = { title: (h2 || h3)[1].trim(), level: h2 ? 2 : 3, bodyLines: [] };
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

function markdownAboutToGridHtml(markdown) {
  const parsed = parseMarkdownSections(markdown);
  let cardIndex = 0;

  const sections = parsed
    .map((sec) => {
      const body = sec.bodyLines.join('\n').trim();
      if (sec.preamble && !sec.title) {
        if (!body) return '';
        return cardSection('Kuhusu', bodyMarkdownToAboutHtml(body), cardIndex++);
      }
      if (!sec.title) return '';
      const valuesGrid = /tunu/i.test(sec.title);
      const bodyHtml = bodyMarkdownToAboutHtml(body, { valuesGrid });
      return cardSection(sec.title, bodyHtml, cardIndex++, { compact: sec.level === 3 });
    })
    .filter(Boolean);

  if (sections.length === 0) return '';
  return `<div class="about-grid">${sections.join('')}</div>`;
}

function isSectionHeading(el) {
  return el && el.nodeType === Node.ELEMENT_NODE && (el.tagName === 'H2' || el.tagName === 'H3');
}

function splitSanitizedHtmlByH2(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  let scope = doc.body;

  const directChildren = Array.from(scope.children);
  const hasDirectHeading = directChildren.some(isSectionHeading);

  if (!hasDirectHeading && directChildren.length === 1) {
    const inner = directChildren[0];
    if (inner && Array.from(inner.children).some(isSectionHeading)) {
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
    if (isSectionHeading(node)) {
      if (current.length) groups.push(current);
      current = [node];
    } else {
      current.push(node);
    }
  }
  if (current.length) groups.push(current);

  const hasHeading = groups.some((g) => g.some(isSectionHeading));
  if (!hasHeading) return null;

  return groups.map((groupNodes) => {
    const wrap = doc.createElement('div');
    groupNodes.forEach((n) => wrap.appendChild(n.cloneNode(true)));
    return wrap.innerHTML;
  });
}

function wrapHtmlSplitSection(innerHtml, index) {
  const stripe = STRIPES[index % STRIPES.length];
  const icon = ICONS[index % ICONS.length];
  return (
    `<section class="about-card ${stripe} about-card--cms about-html-split">` +
    `<div class="about-card__head"><span class="about-card__icon" aria-hidden="true">` +
    `<i class="fas ${icon}"></i></span></div>` +
    `<div class="about-card__cms-body">${innerHtml}</div></section>`
  );
}

function wrapSingleProseCard(html) {
  return (
    `<div class="about-grid">` +
    `<article class="about-card about-card--cms about-card--stripe-blue">` +
    `<div class="about-card__cms-body">${html}</div>` +
    `</article></div>`
  );
}

export function prepareAboutHtml(page) {
  if (!page) return { html: '', variant: 'prose' };

  const rawHtml = String(page.html_content || '').trim();
  const rawPlain = String(page.content || '').trim();

  const tryMarkdown = (src) => {
    if (!looksLikeMarkdownPlain(src)) return null;
    const grid = markdownAboutToGridHtml(src);
    if (!grid) return null;
    return { html: DOMPurify.sanitize(grid), variant: 'grid' };
  };

  if (!hasRealHtml(rawHtml) && !hasRealHtml(rawPlain)) {
    const md = tryMarkdown(rawHtml) || tryMarkdown(rawPlain);
    if (md) return md;
    const fallback = rawHtml || rawPlain;
    if (fallback) {
      return {
        html: DOMPurify.sanitize(wrapSingleProseCard(DOMPurify.sanitize(fallback))),
        variant: 'grid',
      };
    }
    return { html: '', variant: 'prose' };
  }

  const htmlSrc = hasRealHtml(rawHtml) ? rawHtml : rawPlain;
  if (htmlSrc) {
    const clean = DOMPurify.sanitize(htmlSrc);
    const parts = splitSanitizedHtmlByH2(clean);
    if (parts && parts.length > 0) {
      const wrapped = parts.map((inner, i) => wrapHtmlSplitSection(inner, i)).join('');
      return { html: DOMPurify.sanitize(`<div class="about-grid">${wrapped}</div>`), variant: 'grid' };
    }
    return { html: DOMPurify.sanitize(wrapSingleProseCard(clean)), variant: 'grid' };
  }

  const md = tryMarkdown(rawHtml) || tryMarkdown(rawPlain);
  if (md) return md;

  const fallback = rawHtml || rawPlain;
  return { html: DOMPurify.sanitize(wrapSingleProseCard(DOMPurify.sanitize(fallback))), variant: 'grid' };
}
