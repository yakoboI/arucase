import { useLocation } from 'react-router-dom';

const BLOCKED_EXACT = new Set(['/login']);
const BLOCKED_PREFIX = ['/admin'];

/** Show floating chat on all public website routes */
export function useShowPublicChatbot() {
  const { pathname } = useLocation();
  if (BLOCKED_EXACT.has(pathname)) return false;
  if (BLOCKED_PREFIX.some((p) => pathname.startsWith(p))) return false;
  return true;
}
