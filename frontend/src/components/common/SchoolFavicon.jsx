/**
 * Sets tab favicon and apple-touch icon from public homepage settings (school logo),
 * matching PublicHeader branding.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicAPI } from '../../services/public';
import { resolveStaticUrl } from '../../utils/backendUrl';

const DEFAULT_LOGO_PATH = '/uploads/photos/9749b4af-7e1c-454b-a482-37a0f64162f1.jpg';

function faviconMime(href) {
  const base = href.split('?')[0].toLowerCase();
  if (base.endsWith('.svg')) return 'image/svg+xml';
  if (base.endsWith('.webp')) return 'image/webp';
  if (base.endsWith('.jpg') || base.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/png';
}

function ensureLink(rel) {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

export default function SchoolFavicon() {
  const { data: homepageData } = useQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      try {
        const res = await publicAPI.getHomepage();
        return res.data;
      } catch {
        return { settings: {} };
      }
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const settings = homepageData?.settings || {};
    const rawPath = settings?.school_logo || DEFAULT_LOGO_PATH;
    const href = resolveStaticUrl(rawPath);
    if (!href) return;

    const icon = ensureLink('icon');
    icon.href = href;
    icon.type = faviconMime(href);

    const apple = ensureLink('apple-touch-icon');
    apple.href = href;
  }, [homepageData]);

  return null;
}
