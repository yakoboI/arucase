import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isAuthenticated() && token) {
      // Use VITE_WS_URL if set, otherwise construct from VITE_API_URL or window.location
      let wsUrl = import.meta.env.VITE_WS_URL;
      if (!wsUrl) {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl) {
          // Convert http:// to ws:// and remove /api if present
          wsUrl = apiUrl.replace('http://', 'ws://').replace('https://', 'wss://').replace('/api', '');
        } else {
          // Fallback: use same hostname/port as current page
          wsUrl = `ws://${window.location.hostname}:${window.location.port === '3001' ? '5000' : window.location.port}`;
        }
      }
      const newSocket = io(wsUrl, {
        transports: ['websocket'],
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
        // Stop reconnect loop for auth-related socket failures.
        if (error?.message?.toLowerCase?.().includes('unauthorized') || error?.message?.toLowerCase?.().includes('auth')) {
          newSocket.io.opts.reconnection = false;
          newSocket.close();
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated]);

  const value = {
    socket,
    connected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

