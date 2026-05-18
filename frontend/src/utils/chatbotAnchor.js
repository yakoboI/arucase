const STORAGE_KEY = 'arucase-chatbot-anchor';
export const FAB_SIZE = 56;
export const CHAT_MARGIN = 16;

/** @typedef {'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'} ChatCorner */

export function loadChatAnchor() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { corner: 'bottom-right' };
    const parsed = JSON.parse(raw);
    if (parsed?.corner) return { corner: parsed.corner };
  } catch {
    /* ignore */
  }
  return { corner: 'bottom-right' };
}

export function saveChatAnchor(anchor) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(anchor));
  } catch {
    /* ignore */
  }
}

export function cornerToFabPosition(corner, fabSize = FAB_SIZE, margin = CHAT_MARGIN) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const safeM = Math.max(margin, 8);

  switch (corner) {
    case 'bottom-left':
      return { x: safeM, y: vh - fabSize - safeM };
    case 'top-right':
      return { x: vw - fabSize - safeM, y: safeM };
    case 'top-left':
      return { x: safeM, y: safeM };
    case 'bottom-right':
    default:
      return { x: vw - fabSize - safeM, y: vh - fabSize - safeM };
  }
}

/** Snap free position to nearest corner */
export function snapToCorner(x, y, fabSize = FAB_SIZE) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = x + fabSize / 2;
  const cy = y + fabSize / 2;
  const corner =
    cy >= vh / 2
      ? cx >= vw / 2
        ? 'bottom-right'
        : 'bottom-left'
      : cx >= vw / 2
        ? 'top-right'
        : 'top-left';
  return { corner, ...cornerToFabPosition(corner, fabSize) };
}

export function clampFabPosition(x, y, fabSize = FAB_SIZE, margin = CHAT_MARGIN) {
  const maxX = window.innerWidth - fabSize - margin;
  const maxY = window.innerHeight - fabSize - margin;
  return {
    x: Math.max(margin, Math.min(maxX, x)),
    y: Math.max(margin, Math.min(maxY, y)),
  };
}

/** Panel top-left so it sits beside the FAB for each corner */
export function panelPositionForCorner(corner, fabPos, panelW, panelH, fabSize = FAB_SIZE, gap = 10) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = CHAT_MARGIN;
  let left = fabPos.x;
  let top = fabPos.y;

  switch (corner) {
    case 'bottom-right':
      left = fabPos.x + fabSize - panelW;
      top = fabPos.y - panelH - gap;
      break;
    case 'bottom-left':
      left = fabPos.x;
      top = fabPos.y - panelH - gap;
      break;
    case 'top-right':
      left = fabPos.x + fabSize - panelW;
      top = fabPos.y + fabSize + gap;
      break;
    case 'top-left':
      left = fabPos.x;
      top = fabPos.y + fabSize + gap;
      break;
    default:
      break;
  }

  left = Math.max(margin, Math.min(vw - panelW - margin, left));
  top = Math.max(margin, Math.min(vh - panelH - margin, top));
  return { left, top };
}
