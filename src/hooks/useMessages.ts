import { useEffect } from 'react';
import { useChat } from './useChat';
import { useSocket } from './useSocket';
import { useAuth } from './useAuth';

// Sirf ChatWindow mein call hona chahiye — ek baar per conversation
// MessageBubble mein kabhi mat use karo
export const useMessages = (conversationId: string | null) => {
  const {
    messages,
    loadingMessages,
    hasMoreMessages,
    loadingMoreMessages,
    errorLoadingMore,
    fetchMessages,
    fetchMoreMessages,
  } = useChat();
  const { socket } = useSocket();
  const { user }= useAuth();

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId);
    if (socket && user) {
      socket.emit('messages_seen', { conversationId, viewerId: user._id });
    }
  }, [conversationId]);// eslint-disable-line

  return {
    messages,
    loadingMessages,
    hasMoreMessages,
    loadingMoreMessages,
    errorLoadingMore,
    fetchMoreMessages,
  };
};