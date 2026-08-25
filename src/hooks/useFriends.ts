import { useState, useCallback } from "react";
import { useChat } from "./useChat";
import { useSocket } from "./useSocket";
import api from "@/api/axios";
import { FRIENDS } from "@/api/endpoints";
import { UserWithRelationship } from "@/types/user";
import { FriendRequest } from "@/types/friend";
import { Conversation } from "@/types/conversation";

export const useFriends = () => {
  const {
    pendingRequests,
    removePendingRequest,
    fetchConversations,
    fetchConnectedUsers,
  } = useChat();
  const { socket } = useSocket();

  const [searchResult, setSearchResult] = useState<UserWithRelationship | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const searchByEmail = useCallback(async (email: string) => {
    if (!email.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const { data } = await api.get<UserWithRelationship>(
        `${FRIENDS.SEARCH}?email=${encodeURIComponent(email)}`,
      );
      setSearchResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setSearchError(msg || "No user found");
    } finally {
      setSearching(false);
    }
  }, []);

  const sendRequest = useCallback(async (toId: string) => {
    setSendingId(toId);
    try {
      await api.post(FRIENDS.SEND_REQUEST, { toId });
      setSearchResult((prev) =>
        prev && prev._id === toId ? { ...prev, relationship: 'REQUEST_SENT' } : prev
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      alert(msg || "Failed to send request");
    } finally {
      setSendingId(null);
    }
  }, []);

  const acceptRequest = useCallback(
    async (target: FriendRequest | string) => {
      const requestId = typeof target === "string" ? target : target._id;
      const fromId = typeof target === "string" ? "" : target.from?._id;
      setRespondingId(requestId);
      try {
        const { data } = await api.post<{ conversation: Conversation }>(
          FRIENDS.ACCEPT(requestId),
        );
        removePendingRequest(requestId);
        setSearchResult((prev) =>
          prev && (prev.requestId === requestId || prev._id === fromId)
            ? { ...prev, relationship: "FRIENDS" }
            : prev
        );
        // Join the new room
        if (socket) socket.emit("join_conversation", data.conversation._id);
        await fetchConversations();
        await fetchConnectedUsers();
      } catch {
        /* ignore */
      } finally {
        setRespondingId(null);
      }
    },
    [removePendingRequest, socket, fetchConversations, fetchConnectedUsers],
  );

  const declineRequest = useCallback(
    async (target: FriendRequest | string) => {
      const requestId = typeof target === "string" ? target : target._id;
      const fromId = typeof target === "string" ? "" : target.from?._id;
      setRespondingId(requestId);
      try {
        await api.post(FRIENDS.DECLINE(requestId));
        removePendingRequest(requestId);
        setSearchResult((prev) =>
          prev && (prev.requestId === requestId || prev._id === fromId)
            ? { ...prev, relationship: "NOT_FRIENDS" }
            : prev
        );
      } catch {
        /* ignore */
      } finally {
        setRespondingId(null);
      }
    },
    [removePendingRequest],
  );

  return {
    pendingRequests,
    searchResult,
    searching,
    searchError,
    sendingId,
    respondingId,
    searchByEmail,
    sendRequest,
    acceptRequest,
    declineRequest,
  };
};
