import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

/** HTTP heartbeat interval — light load, keeps cookie-auth users in presence set */
const HEARTBEAT_MS = 60_000;

/**
 * Live count of staff users currently logged in (sidebar indicator).
 * Socket updates when available; HTTP heartbeat every 60s as fallback.
 */
export function useOnlineStaffCount() {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [count, setCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated?.()) return undefined;

    const applyCount = (value) => {
      if (!mountedRef.current) return;
      const n = Number(value);
      setCount(Number.isFinite(n) && n >= 0 ? n : 0);
    };

    const onPresence = (payload) => {
      applyCount(payload?.count);
    };

    socket?.on('presence:online-count', onPresence);

    const sendHeartbeat = async () => {
      try {
        const res = await api.post('/auth/presence/heartbeat');
        applyCount(res.data?.count);
      } catch {
        try {
          const res = await api.get('/auth/presence/online-count');
          applyCount(res.data?.count);
        } catch {
          /* offline or unauthenticated — keep last count */
        }
      }
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, HEARTBEAT_MS);

    return () => {
      socket?.off('presence:online-count', onPresence);
      clearInterval(intervalId);
    };
  }, [socket, isAuthenticated]);

  return count;
}

export default useOnlineStaffCount;
