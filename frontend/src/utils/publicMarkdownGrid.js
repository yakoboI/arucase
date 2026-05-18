/**
 * Turn Public Pages markdown (## / ### headings) into themed card grids.
 */
import DOMPurify from 'dompurify';
import { cmsSectionId } from './cmsSectionId';
import {
  escapeHtml,
  looksLikeMarkdownPlain,
  hasRealHtml,
  parseMarkdownSections,
  bodyMarkdownToHtml,
} from './publicCmsMarkdown';

const THEMES = {
  staff: {
    gridClass: 'staff-cms-grid',
    sectionBase: 'content-card staff-surface staff-surface--chunk',
    stripes: [
      'staff-surface--stripe-navy',
      'staff-surface--stripe-teal',
      'staff-surface--stripe-slate',
      'staff-surface--stripe-gold',
    ],
    titleClass: 'staff-chunk__title',
    textClass: 'staff-chunk__text',
    listClass: 'staff-chunk__contacts',
    bodyWrapClass: 'staff-chunk__body',
    icon: 'fa-users',
    skipIntro: /^watumishi$/i,
  },
  admissions: {
    gridClass: 'admissions-grid',
    sectionBase: 'admissions-card',
    stripes: [],
    titleClass: 'admissions-card__title',
    textClass: 'admissions-card__intro',
    listClass: 'admissions-checklist',
    icon: 'fa-graduation-cap',
    useCardHead: true,
    headClass: 'admissions-card__head',
    iconClass: 'admissions-card__icon',
    bodyWrapClass: 'admissions-card__body',
    skipIntro: /^udahili$/i,
  },
  studentLife: {
    gridClass: 'student-life-grid',
    sectionBase: 'content-card sl-surface sl-surface--chunk',
    stripes: [
      'sl-surface--stripe-navy',
      'sl-surface--stripe-teal',
      'sl-surface--stripe-slate',
      'sl-surface--stripe-gold',
    ],
    titleClass: 'sl-card__title',
    textClass: 'sl-card__intro',
    listClass: 'sl-list',
    icon: 'fa-child',
    useCardHead: true,
    headClass: 'sl-card__head',
    iconClass: 'sl-card__icon',
    bodyWrapClass: 'sl-card__body',
    skipIntro: /^maisha ya wanafunzi$/i,
  },
  contact: {
    gridClass: 'contact-cms-grid',
    sectionBase: 'contact-card',
    stripes: [],
    titleClass: 'contact-card__title',
    textClass: 'contact-card__body',
    listClass: 'contact-list',
    icon: 'fa-envelope',
    useCardHead: true,
    headClass: 'contact-card__head',
    iconClass: 'contact-card__icon',
    bodyWrapClass: 'contact-card__body',
    skipIntro: /^mawasiliano$/i,
  },
  privacy: {
    gridClass: 'policy-cms-grid',
    sectionBase: 'content-card policy-surface policy-surface--chunk policy-rich-content',
    stripes: [
      'policy-surface--stripe-navy',
      'policy-surface--stripe-slate',
      'policy-surface--stripe-teal',
      'policy-surface--stripe-gold',
    ],
    titleClass: 'policy-fact__title',
    textClass: 'policy-fact__text',
    listClass: 'policy-chunk__list',
    h3Class: 'policy-chunk__h3',
    splitH3: false,
    icon: 'fa-shield-halved',
    useCardHead: true,
    headClass: 'policy-chunk__head',
    iconClass: 'policy-fact__icon',
    bodyWrapClass: 'policy-chunk__body',
    skipIntro: /^sera ya faragha$/i,
  },
};

function bodyToHtml(body, theme) {
  return bodyMarkdownToHtml(body, {
    listClass: theme.listClass,
    textClass: theme.textClass,
    h3Class: theme.h3Class,
  });
}

function shouldSkipSection(theme, title, body) {
  if (!body.trim() && theme.skipIntro?.test(title.trim())) return true;
  if (!body.trim()) return true;
  return false;
}

function buildSection(theme, title, bodyHtml, idx) {
  const stripe = theme.stripes.length ? ` ${theme.stripes[idx % theme.stripes.length]}` : '';
  const sectionPrefix = theme.gridClass.replace(/-grid$/, '') || theme.gridClass;
  const hId = cmsSectionId(title, sectionPrefix, idx);
  const safeTitle = escapeHtml(title);

  if (theme.useCardHead) {
    return (
      `<section class="${theme.sectionBase}${stripe}" aria-labelledby="${hId}">` +
      `<div class="${theme.headClass}">` +
      `<span class="${theme.iconClass}" aria-hidden="true"><i class="fas ${theme.icon}"></i></span>` +
      `<h2 id="${hId}" class="${theme.titleClass}">${safeTitle}</h2>` +
      `</div>` +
      `<div class="${theme.bodyWrapClass}">${bodyHtml}</div>` +
      `</section>`
    );
  }

  const bodyBlock = theme.bodyWrapClass
    ? `<div class="${theme.bodyWrapClass}">${bodyHtml}</div>`
    : bodyHtml;

  return (
    `<section class="${theme.sectionBase}${stripe}" aria-labelledby="${hId}">` +
    `<h2 id="${hId}" class="${theme.titleClass}">${safeTitle}</h2>` +
    `${bodyBlock}` +
    `</section>`
  );
}

function markdownToGridHtml(markdown, themeKey) {
  const theme = THEMES[themeKey];
  if (!theme) return '';

  const parsed = parseMarkdownSections(markdown, { splitH3: theme.splitH3 !== false });
  let cardIndex = 0;

  const sections = parsed
    .map((sec) => {
      const body = sec.bodyLines.join('\n').trim();
      if (sec.preamble && !sec.title) {
        if (!body) return '';
        return buildSection(theme, 'Taarifa', bodyToHtml(body, theme), cardIndex++);
      }
      if (!sec.title || shouldSkipSection(theme, sec.title, body)) return '';
      return buildSection(theme, sec.title, bodyToHtml(body, theme), cardIndex++);
    })
    .filter(Boolean);

  if (sections.length === 0) return '';
  return `<div class="${theme.gridClass} public-cms-grid">${sections.join('')}</div>`;
}

function isSectionHeading(el) {
  return el && el.nodeType === Node.ELEMENT_NODE && (el.tagName === 'H2' || el.tagName === 'H3');
}

function splitSanitizedHtmlByHeadings(html) {
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

function wrapHtmlSplitSection(innerHtml, theme, index) {
  const stripe = theme.stripes.length ? ` ${theme.stripes[index % theme.stripes.length]}` : '';
  if (theme.useCardHead) {
    return `<section class="${theme.sectionBase}${stripe} ${theme.sectionBase}--html-split">${innerHtml}</section>`;
  }
  return `<section class="${theme.sectionBase}${stripe} ${theme.sectionBase}--html-split">${innerHtml}</section>`;
}

/**
 * @param {{ html_content?: string, content?: string } | null} page
 * @param {'staff' | 'admissions' | 'studentLife' | 'contact' | 'privacy'} themeKey
 */
export function preparePublicMarkdownHtml(page, themeKey) {
  if (!page) return { html: '', variant: 'prose' };

  const theme = THEMES[themeKey];
  if (!theme) return { html: '', variant: 'prose' };

  const rawHtml = String(page.html_content || '').trim();
  const rawPlain = String(page.content || '').trim();

  const tryMarkdown = (src) => {
    if (!looksLikeMarkdownPlain(src)) return null;
    const grid = markdownToGridHtml(src, themeKey);
    if (!grid) return null;
    return { html: DOMPurify.sanitize(grid), variant: 'grid' };
  };

  if (!hasRealHtml(rawHtml) && !hasRealHtml(rawPlain)) {
    const md = tryMarkdown(rawHtml) || tryMarkdown(rawPlain);
    if (md) return md;
    const fallback = rawHtml || rawPlain;
    if (fallback) return { html: DOMPurify.sanitize(escapeHtml(fallback).replace(/\n/g, '<br>')), variant: 'prose' };
    return { html: '', variant: 'prose' };
  }

  const htmlSrc = hasRealHtml(rawHtml) ? rawHtml : rawPlain;
  if (htmlSrc) {
    const clean = DOMPurify.sanitize(htmlSrc);
    const parts = splitSanitizedHtmlByHeadings(clean);
    if (parts && parts.length > 0) {
      const wrapped = parts.map((inner, i) => wrapHtmlSplitSection(inner, theme, i)).join('');
      return {
        html: DOMPurify.sanitize(`<div class="${theme.gridClass} public-cms-grid">${wrapped}</div>`),
        variant: 'grid',
      };
    }
    return { html: clean, variant: 'prose' };
  }

  const md = tryMarkdown(rawHtml) || tryMarkdown(rawPlain);
  if (md) return md;

  const fallback = rawHtml || rawPlain;
  return { html: DOMPurify.sanitize(fallback), variant: 'prose' };
}

export function prepareStaffHtml(page) {
  return preparePublicMarkdownHtml(page, 'staff');
}

export function prepareAdmissionsHtml(page) {
  return preparePublicMarkdownHtml(page, 'admissions');
}

export function prepareStudentLifeHtml(page) {
  return preparePublicMarkdownHtml(page, 'studentLife');
}

export function prepareContactHtml(page) {
  return preparePublicMarkdownHtml(page, 'contact');
}

export function preparePrivacyHtml(page) {
  return preparePublicMarkdownHtml(page, 'privacy');
}

/** @param {'staff'|'admissions'|'studentLife'|'contact'|'privacy'} themeKey */
export function createPublicCmsPrepareHtml(themeKey) {
  return (page) => {
    const prepared = preparePublicMarkdownHtml(page, themeKey);
    return { html: prepared.html, variant: prepared.variant };
  };
}
