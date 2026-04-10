// Kept for backward compatibility — People tab now uses useFriends hook
import { useChat } from './useChat';
export const useUsers = () => {
  const { onlineUsers } = useChat();
  return { onlineUsers };
};
