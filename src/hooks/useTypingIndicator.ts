/**
 * useTypingIndicator
 * Listens for typing_start / typing_stop events from other users in a conversation.
 */
import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

interface TypingUser {
  userId: string;
  username: string;
}

export const useTypingIndicator = (conversationId: string | null) => {
  const { socket } = useSocket();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Listen for the new event names from sockets/events.ts
    const onStart = ({ conversationId: cid, username, userId }: { conversationId: string; username: string; userId: string }) => {
      if (cid !== conversationId) return;
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userId) ? prev : [...prev, { userId, username }]
      );
    };

    const onStop = ({ conversationId: cid, userId }: { conversationId: string; userId: string }) => {
      if (cid !== conversationId) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    };

    socket.on('user_typing', onStart);
    socket.on('user_stop_typing', onStop);

    return () => {
      socket.off('user_typing', onStart);
      socket.off('user_stop_typing', onStop);
    };
  }, [socket, conversationId]);

  // Build a readable typing message e.g. "Alice is typing" or "Alice and Bob are typing"
  const typingText =
    typingUsers.length === 0 ? null
    : typingUsers.length === 1 ? `${typingUsers[0].username} is typing`
    : typingUsers.length === 2 ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing`
    : 'Several people are typing';

  return { typingUsers, typingText, isTyping: typingUsers.length > 0 };
};
