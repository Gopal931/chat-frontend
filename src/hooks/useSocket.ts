import { useContext } from 'react';
import { SocketContext } from '@/contexts/SocketContext';
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (ctx === undefined) throw new Error('useSocket must be inside SocketProvider');
  return ctx;
};
