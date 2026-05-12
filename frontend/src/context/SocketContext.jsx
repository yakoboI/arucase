import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getWebSocketUrl } from '../utils/backendUrl';

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
  const auth = useAuth();

  useEffect(() => {
    if (auth && auth.isAuthenticated && auth.isAuthenticated()) {
      const wsUrl = getWebSocketUrl();
      if (!wsUrl) {
        return undefined;
      }
      const newSocket = io(wsUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 3,
        withCredentials: true, // Include cookies for authentication
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
  }, [auth]);

  const value = {
    socket,
    connected,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

