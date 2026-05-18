/**
 * Fetches public_pages CMS content — no hardcoded marketing copy on the public site.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import PublicLayout from '../layout/PublicLayout';
import Loading from '../common/Loading';
import { publicAPI } from '../../services/public';
import { getPageHtml, hasPublishedPage } from '../../utils/publicPageContent';
import PublicPageHero from './PublicPageHero';
import { createPublicCmsPrepareHtml, preparePublicMarkdownHtml } from '../../utils/publicMarkdownGrid';
import './PublicCmsPage.css';

export { createPublicCmsPrepareHtml };

/** Standalone CMS block (e.g. Contact page custom layout). */
export function PublicCmsPreparedBlock({ page, themeKey, proseClassName = 'public-cms-body content-card' }) {
  const prepared = preparePublicMarkdownHtml(page, themeKey);
  if (!prepared.html) return null;
  if (prepared.variant === 'grid') {
    return <div dangerouslySetInnerHTML={{ __html: prepared.html }} />;
  }
  return (
    <article
      className={proseClassName}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(prepared.html) }}
    />
  );
}

export function PublicCmsEmpty({ pageLabel }) {
  return (
    <div className="public-cms-empty" role="status">
      <p>Maudhui ya ukurasa huu hayajachapishwa bado.</p>
      <p className="public-cms-empty__hint">
        Ongeza maudhui katika Admin → Public Pages
        {pageLabel ? ` (${pageLabel})` : ''}.
      </p>
    </div>
  );
}

export function usePublicPage(slug) {
  return useQuery({
    queryKey: ['page', slug],
    queryFn: () => publicAPI.getPage(slug),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

/** Render sanitized CMS HTML */
export function PublicCmsHtml({ page, className = 'public-cms-body public-cms-body--prose content-card' }) {
  const html = getPageHtml(page);
  if (!html) return null;
  return (
    <article
      className={className}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

/**
 * Full-page CMS shell: header + CMS or empty notice.
 * Use `children` for non-CMS blocks (e.g. staff directory).
 */
export default function PublicCmsPage({
  pageSlug,
  pageLabel,
  loadingMessage = 'Inapakia ukurasa...',
  shellClassName = '',
  innerClassName = '',
  header = null,
  footer = null,
  children = null,
  afterHero = null,
  prepareHtml = null,
  cmsClassName,
  hashScroll = false,
  showPageHero = false,
  heroVariant = 'default',
  heroSettings = null,
}) {
  const { data: pageData, isLoading, isError } = usePublicPage(pageSlug);

  const { data: heroSettingsData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      const res = await publicAPI.getHomepage();
      return res.data?.settings || {};
    },
    enabled: showPageHero && !heroSettings,
    staleTime: 10 * 60 * 1000,
  });

  const settingsForHero = heroSettings || heroSettingsData || {};

  const page = pageData?.data?.page;
  const published = !isLoading && !isError && hasPublishedPage(page);

  useEffect(() => {
    if (!hashScroll || !published) return;
    const id = window.location.hash?.replace(/^#/, '').trim();
    if (!id) return;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(t);
  }, [hashScroll, published]);

  if (isLoading) {
    return (
      <PublicLayout>
        <Loading message={loadingMessage} />
      </PublicLayout>
    );
  }

  let cmsNode = null;

  if (published) {
    if (prepareHtml) {
      const prepared = prepareHtml(page);
      const html = typeof prepared === 'string' ? prepared : prepared?.html;
      const variant = prepared?.variant || 'prose';
      if (html) {
        cmsNode =
          variant === 'grid' ? (
            <div
              className={cmsClassName || 'public-cms-grid-host'}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
            />
          ) : (
            <PublicCmsHtml page={{ html_content: html }} className={cmsClassName} />
          );
      }
    } else {
      cmsNode = <PublicCmsHtml page={page} className={cmsClassName} />;
    }
  }

  return (
    <PublicLayout>
      <div className={shellClassName}>
        <div className={innerClassName}>
          {header}
          {showPageHero ? (
            <PublicPageHero
              page={page}
              fallbackTitle={pageLabel}
              settings={settingsForHero}
              variant={heroVariant}
            />
          ) : null}
          {afterHero}
          {published ? cmsNode : <PublicCmsEmpty pageLabel={pageLabel} />}
          {children}
          {footer}
        </div>
      </div>
    </PublicLayout>
  );
}
