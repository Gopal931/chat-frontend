import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { ChatContext } from './ChatContext';

interface SocketContextType { socket: Socket | null; }
export const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const { _setSocket } = useContext(ChatContext);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      _setSocket(null);
      setSocket((prev) => { prev?.disconnect(); return null; });
      return;
    }

    const s = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });

    s.on('connect',() => console.log('[Socket] Connected:', s.id));
    s.on('disconnect',(r) => console.log('[Socket] Disconnected:', r));
    s.on('connect_error',(e) => console.error('[Socket] Error:', e.message));

    _setSocket(s);
    setSocket(s);

    return () => { _setSocket(null); s.disconnect(); };
  }, [isAuthenticated, user?.token, _setSocket]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};
