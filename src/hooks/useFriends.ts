import { useState, useCallback } from 'react';
import { useChat } from './useChat';
import { useSocket } from './useSocket';
import api from '@/api/axios';
import { FRIENDS } from '@/api/endpoints';
import { User } from '@/types/user';
import { FriendRequest } from '@/types/friend';
import { Conversation } from '@/types/conversation';

export const useFriends = () => {
  const { pendingRequests, removePendingRequest, fetchConversations, fetchConnectedUsers } = useChat();
  const { socket } = useSocket();

  const [searchResult, setSearchResult]       = useState<User | null>(null);
  const [searching, setSearching]             = useState(false);
  const [searchError, setSearchError]         = useState('');
  const [sentRequestIds, setSentRequestIds]   = useState<Set<string>>(new Set());
  const [sendingId, setSendingId]             = useState<string | null>(null);
  const [respondingId, setRespondingId]       = useState<string | null>(null);

  const searchByEmail = useCallback(async (email: string) => {
    if (!email.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const { data } = await api.get<User>(`${FRIENDS.SEARCH}?email=${encodeURIComponent(email)}`);
      setSearchResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSearchError(msg || 'No user found');
    } finally { setSearching(false); }
  }, []);

  const sendRequest = useCallback(async (toId: string) => {
    setSendingId(toId);
    try {
      await api.post(FRIENDS.SEND_REQUEST, { toId });
      setSentRequestIds((prev) => new Set([...prev, toId]));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Failed to send request');
    } finally { setSendingId(null); }
  }, []);

  const acceptRequest = useCallback(async (request: FriendRequest) => {
    setRespondingId(request._id);
    try {
      const { data } = await api.post<{ conversation: Conversation }>(FRIENDS.ACCEPT(request._id));
      removePendingRequest(request._id);
      // Join the new room
      if (socket) socket.emit('join_conversation', data.conversation._id);
      await fetchConversations();
      await fetchConnectedUsers();
    } catch { /* ignore */ }
    finally { setRespondingId(null); }
  }, [removePendingRequest, socket, fetchConversations, fetchConnectedUsers]);

  const declineRequest = useCallback(async (request: FriendRequest) => {
    setRespondingId(request._id);
    try {
      await api.post(FRIENDS.DECLINE(request._id));
      removePendingRequest(request._id);
    } catch { /* ignore */ }
    finally { setRespondingId(null); }
  }, [removePendingRequest]);

  return {
    pendingRequests, searchResult, searching, searchError,
    sentRequestIds, sendingId, respondingId,
    searchByEmail, sendRequest, acceptRequest, declineRequest,
  };
};
