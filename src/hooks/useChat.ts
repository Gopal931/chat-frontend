import { useContext } from 'react';
import { ChatContext } from '@/contexts/ChatContext';
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be inside ChatProvider');
  return ctx;
};
