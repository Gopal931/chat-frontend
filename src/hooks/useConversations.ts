import { useEffect, useRef } from 'react';
import { useChat } from './useChat';

export const useConversations = () => {
  const {
    conversations, loadingConversations, fetchConversations,
    activeConversation, setActiveConversation,
    createGroupConversation, removeConversation,
    connectedUsers, fetchConnectedUsers,
  } = useChat();

  const fetched = useRef(false);
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchConversations();
    fetchConnectedUsers();
  }, []); // eslint-disable-line

  return {
    conversations, loadingConversations, activeConversation,
    setActiveConversation, createGroupConversation, removeConversation,
    connectedUsers, refetch: fetchConversations,
  };
};
