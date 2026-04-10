import { useCallback } from 'react';
import api from '@/api/axios';
import { MESSAGES } from '@/api/endpoints';

// Sirf edit aur delete — fetchMessages nahi chalega
// MessageBubble ye hook use karta hai, useMessages nahi
export const useMessageActions = () => {
  const editMessage = useCallback(async (messageId: string, text: string) => {
    const { data } = await api.put(MESSAGES.EDIT(messageId), { text });
    return data;
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    await api.delete(MESSAGES.DELETE(messageId));
  }, []);

  return { editMessage, deleteMessage };
};