import { publicAPI } from '../services/public';
import { resolveStaticUrl } from './backendUrl';
import { heroImageUrl } from './cloudinaryImage';

export function isHomeRoute() {
  const path = window.location.pathname;
  return path === '/' || path === '';
}

/** Warm homepage API + LCP image before React paints the carousel. */
export async function prefetchHomepageData(queryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['homepage'],
    queryFn: async () => {
      const res = await publicAPI.getHomepage();
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const data = queryClient.getQueryData(['homepage']);
  const firstPhoto = data?.gallery_photos?.[0];
  if (!firstPhoto?.path) return;

  const url = heroImageUrl(resolveStaticUrl(firstPhoto.path));
  if (!url) return;

  const existing = document.querySelector(`link[rel="preload"][as="image"][href="${CSS.escape(url)}"]`);
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.fetchPriority = 'high';
  document.head.appendChild(link);
}

/** Start downloading the homepage route chunk while API is in flight. */
export function prefetchHomePageChunks() {
  import('../pages/public/HomePage').catch(() => {});
}
