/**
 * In-memory presence for logged-in staff (admin sidebar live count).
 * Unique users counted via active Socket.IO connections and/or HTTP heartbeats.
 */

const STALE_MS = 90_000; // 90s without heartbeat → offline if no socket
const BROADCAST_DEBOUNCE_MS = 400;

/** @type {import('socket.io').Server | null} */
let ioRef = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let broadcastTimer = null;

/** userId -> Set<socketId> */
const socketsByUser = new Map();
/** socketId -> userId */
const socketToUser = new Map();
/** userId -> last heartbeat timestamp */
const heartbeats = new Map();

function setIO(io) {
  ioRef = io;
}

function getUserIdFromSocket(socket) {
  const u = socket?.user;
  if (!u) return null;
  return u.user_id || u.username || null;
}

function pruneStale() {
  const now = Date.now();
  for (const [userId, last] of heartbeats.entries()) {
    const hasSockets = (socketsByUser.get(userId)?.size ?? 0) > 0;
    if (!hasSockets && now - last > STALE_MS) {
      heartbeats.delete(userId);
    }
  }
}

function getOnlineCount() {
  pruneStale();
  const now = Date.now();
  const ids = new Set();
  for (const userId of socketsByUser.keys()) {
    if ((socketsByUser.get(userId)?.size ?? 0) > 0) ids.add(userId);
  }
  for (const [userId, last] of heartbeats.entries()) {
    if (now - last <= STALE_MS) ids.add(userId);
  }
  return ids.size;
}

function scheduleBroadcast() {
  if (!ioRef) return;
  if (broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    const count = getOnlineCount();
    ioRef.emit('presence:online-count', { count });
  }, BROADCAST_DEBOUNCE_MS);
}

function registerSocket(socket) {
  const userId = getUserIdFromSocket(socket);
  if (!userId) return;
  if (!socketsByUser.has(userId)) socketsByUser.set(userId, new Set());
  socketsByUser.get(userId).add(socket.id);
  socketToUser.set(socket.id, userId);
  heartbeats.set(userId, Date.now());
  scheduleBroadcast();
}

function unregisterSocket(socketId) {
  const userId = socketToUser.get(socketId);
  if (!userId) return;
  socketToUser.delete(socketId);
  const set = socketsByUser.get(userId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) socketsByUser.delete(userId);
  }
  scheduleBroadcast();
}

function recordHeartbeat(userId) {
  if (!userId) return getOnlineCount();
  heartbeats.set(userId, Date.now());
  scheduleBroadcast();
  return getOnlineCount();
}

module.exports = {
  setIO,
  registerSocket,
  unregisterSocket,
  recordHeartbeat,
  getOnlineCount,
  STALE_MS,
};
