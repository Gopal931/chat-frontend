import React, {
  createContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";

import { Conversation } from "../types/conversation";
import { Message, PaginatedMessagesResponse } from "../types/message";
import { User } from "../types/user";
import { FriendRequest } from "../types/friend";
import { useAuth } from '../hooks/useAuth';

import api from "../api/axios";
import { CONVERSATIONS, MESSAGES, FRIENDS } from "../api/endpoints";
import { Socket } from "socket.io-client";

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  nextCursor: string | null;
  errorLoadingMore: boolean;
  onlineUsers: string[];
  pendingRequests: FriendRequest[];
  connectedUsers: User[];
  fetchConversations: () => Promise<void>;
  fetchConnectedUsers: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchMoreMessages: (conversationId: string) => Promise<void>;
  setActiveConversation: (c: Conversation) => void;
  appendMessage: (msg: Message) => void;
  updateMessage: (msg: Message) => void;
  removeMessage: (messageId: string) => void;
  removeConversation: (conversationId: string) => void;
  setOnlineUsers: (ids: string[]) => void;
  removePendingRequest: (requestId: string) => void;
  createGroupConversation: (groupName: string, participantIds: string[]) => Promise<void>;
  _setSocket: (socket: Socket | null) => void;
}

export const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [activeConversation, setActiveState]  = useState<Conversation | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers]         = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [connectedUsers, setConnectedUsers]   = useState<User[]>([]);
  const [loadingConversations, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMsgs]     = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [loadingMoreMessages, setLoadingMoreMsgs] = useState<boolean>(false);
  const [nextCursor, setNextCursor]           = useState<string | null>(null);
  const [errorLoadingMore, setErrorLoadingMore] = useState<boolean>(false);

  const { user } = useAuth();

  const activeConvIdRef = useRef<string | null>(null);
  const joinedRoomsRef  = useRef<Set<string>>(new Set());
  const socketRef       = useRef<Socket | null>(null);

  const nextCursorRef   = useRef<string | null>(null);
  const hasMoreRef      = useRef<boolean>(false);
  const loadingMoreRef  = useRef<boolean>(false);

  // Always holds latest userId without needing it in deps arrays
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?._id ?? null;

  // ── FETCHERS
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const { data } = await api.get<Conversation[]>(CONVERSATIONS.GET_ALL);
      setConversations(data);
    } finally { setLoadingConvs(false); }
  }, []);

  const fetchConnectedUsers = useCallback(async () => {
    try {
      const { data } = await api.get<User[]>(FRIENDS.CONNECTED);
      setConnectedUsers(data);
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMsgs(true);
    setMessages([]);
    setHasMoreMessages(false);
    setNextCursor(null);
    setErrorLoadingMore(false);

    nextCursorRef.current = null;
    hasMoreRef.current = false;
    loadingMoreRef.current = false;

    try {
      const { data } = await api.get<PaginatedMessagesResponse>(MESSAGES.GET(conversationId, 30, null));
      if (activeConvIdRef.current !== conversationId) return;

      setMessages(data.messages || []);
      setNextCursor(data.nextCursor);
      setHasMoreMessages(data.hasMore);

      nextCursorRef.current = data.nextCursor;
      hasMoreRef.current = data.hasMore;
    } catch (err) {
      console.error("Failed to fetch initial messages", err);
    } finally {
      if (activeConvIdRef.current === conversationId) {
        setLoadingMsgs(false);
      }
    }
  }, []);

  const fetchMoreMessages = useCallback(async (conversationId: string) => {
    if (
      !conversationId ||
      loadingMoreRef.current ||
      !hasMoreRef.current ||
      !nextCursorRef.current ||
      activeConvIdRef.current !== conversationId
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMoreMsgs(true);
    setErrorLoadingMore(false);

    const cursorToUse = nextCursorRef.current;

    try {
      const { data } = await api.get<PaginatedMessagesResponse>(MESSAGES.GET(conversationId, 30, cursorToUse));
      if (activeConvIdRef.current !== conversationId) return;

      const olderMsgs = data.messages || [];

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m._id));
        const uniqueOlder = olderMsgs.filter((m) => !existingIds.has(m._id));
        return [...uniqueOlder, ...prev];
      });

      setNextCursor(data.nextCursor);
      setHasMoreMessages(data.hasMore);

      nextCursorRef.current = data.nextCursor;
      hasMoreRef.current = data.hasMore;
    } catch (err) {
      console.error("Failed to fetch older messages", err);
      if (activeConvIdRef.current === conversationId) {
        setErrorLoadingMore(true);
      }
    } finally {
      loadingMoreRef.current = false;
      if (activeConvIdRef.current === conversationId) {
        setLoadingMoreMsgs(false);
      }
    }
  }, []);

  // ── INCOMING MESSAGE ──────────────────────────────────────────────────────────
  const handleIncomingMessage = useCallback((msg: Message) => {
    // Move conversation to top of sidebar
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === msg.conversationId);
      if (idx !== -1) {
        const updated = { ...prev[idx], lastMessage: msg, updatedAt: msg.createdAt };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      }
      return prev;
    });

    // Append to messages only if receiver is in this conversation window
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      if (activeConvIdRef.current !== msg.conversationId) return prev;
      return [...prev, msg];
    });

    // Receiver is already in this window → emit message_seen immediately
    // This gives sender the blue double tick without any page switch
    const s      = socketRef.current;
    const myId   = userIdRef.current;
    const inWindow  = activeConvIdRef.current === msg.conversationId;
    const notMyMsg  = myId && myId !== msg.sender._id;

    if (s && inWindow && notMyMsg) {
      s.emit('message_seen', {
        conversationId: msg.conversationId,
        viewerId:       myId,  // ← current user's ID (not sender's, not conv ID)
      });
    }
  }, []);

  // ── HELPERS ───────────────────────────────────────────────────────────────────
  const appendMessage = useCallback((msg: Message) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === msg.conversationId);
      if (idx !== -1) {
        const updated = { ...prev[idx], lastMessage: msg, updatedAt: msg.createdAt };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      }
      return prev;
    });
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const updateMessage = useCallback((msg: Message) => {
    setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)));
    setConversations((prev) =>
      prev.map((c) => {
        if (c._id !== msg.conversationId) return c;
        if (c.lastMessage?._id === msg._id) {
          return { ...c, lastMessage: { ...c.lastMessage, ...msg } };
        }
        return c;
      })
    );
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c._id !== conversationId));
    setActiveState((prev) => {
      if (prev?._id === conversationId) { activeConvIdRef.current = null; return null; }
      return prev;
    });
    setMessages([]);
    setHasMoreMessages(false);
    setNextCursor(null);
    setErrorLoadingMore(false);
    nextCursorRef.current = null;
    hasMoreRef.current = false;
  }, []);

  const removePendingRequest = useCallback((requestId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
  }, []);

  //SET ACTIVE CONVERSATION 
  const setActiveConversation = useCallback((conv: Conversation) => {
    activeConvIdRef.current = conv._id;
    setActiveState(conv);

    const s = socketRef.current;

    if (s && !joinedRoomsRef.current.has(conv._id)) {
      s.emit('join_conversation', conv._id);
      joinedRoomsRef.current.add(conv._id);
    }

    // Emit message_seen when user opens a conversation
    // userIdRef.current is always the logged-in user's _id — never conv ID
    if (s && userIdRef.current) {
      s.emit('message_seen', {
        conversationId: conv._id,
        viewerId:       userIdRef.current,
      });
    }
  }, []); //empty deps — reads everything from refs

  const createGroupConversation = useCallback(
    async (groupName: string, participantIds: string[]) => {
      const { data } = await api.post<Conversation>(CONVERSATIONS.CREATE, {
        isGroup: true,
        groupName,
        participantIds,
      });
      setConversations((prev) => [data, ...prev]);
      setActiveConversation(data);
    },
    [setActiveConversation],
  );

  // SOCKET 
  const _setSocket = useCallback(
    (socket: Socket | null) => {
      if (socketRef.current) socketRef.current.removeAllListeners();
      socketRef.current = socket;
      joinedRoomsRef.current = new Set();
      if (!socket) return;

      socket.on('connect', () => {
        joinedRoomsRef.current.forEach((id) => socket.emit('join_conversation', id));
      });

      socket.on('pending_requests', (requests: FriendRequest[]) => {
        setPendingRequests(requests);
      });

      socket.on('receive_message', handleIncomingMessage);

      socket.on('message_edited', updateMessage);

      socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
        removeMessage(messageId);
      });

      socket.on('online_users', (ids: string[]) => setOnlineUsers(ids));

      // ── messages_seen ─────────────────────────────────────────────────────
      // Updates BOTH the message list (blue ticks) AND the sidebar conversation
      socket.on('messages_seen', (data: { conversationId: string; seenBy: string }) => {
        console.log('[socket] messages_seen', data);

        // Update all messages in this conversation → blue double tick in chat window
        setMessages((prev) =>
          prev.map((msg) =>
            String(msg.conversationId) === String(data.conversationId)
              ? { ...msg, status: 'seen' as const, read: true }
              : msg
          )
        );

        // Update lastMessage status in sidebar → blue tick next to conversation
        setConversations((prev) =>
          prev.map((c) => {
            if (String(c._id) !== String(data.conversationId)) return c;
            if (!c.lastMessage) return c;
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status: 'seen' as const,
                read:   true,
              },
            };
          })
        );
      });

      socket.on('conversation_created', (conv: Conversation) => {
        setConversations((prev) => {
          if (prev.some((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });
      });

      socket.on('conversation_deleted', ({ conversationId }: { conversationId: string }) => {
        removeConversation(conversationId);
      });

      socket.on('friend_request', (request: FriendRequest) => {
        setPendingRequests((prev) => {
          if (prev.some((r) => r._id === request._id)) return prev;
          return [...prev, request];
        });
      });
    },
    [handleIncomingMessage, updateMessage, removeMessage, removeConversation],
  );

  // ─── MEMO ─────────────────────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      conversations,
      activeConversation,
      messages,
      loadingConversations,
      loadingMessages,
      hasMoreMessages,
      loadingMoreMessages,
      nextCursor,
      errorLoadingMore,
      onlineUsers,
      pendingRequests,
      connectedUsers,
      fetchConversations,
      fetchConnectedUsers,
      fetchMessages,
      fetchMoreMessages,
      setActiveConversation,
      appendMessage,
      updateMessage,
      removeMessage,
      removeConversation,
      setOnlineUsers,
      removePendingRequest,
      createGroupConversation,
      _setSocket,
    }),
    [
      conversations,
      activeConversation,
      messages,
      loadingConversations,
      loadingMessages,
      hasMoreMessages,
      loadingMoreMessages,
      nextCursor,
      errorLoadingMore,
      onlineUsers,
      pendingRequests,
      connectedUsers,
      fetchConversations,
      fetchConnectedUsers,
      fetchMessages,
      fetchMoreMessages,
      setActiveConversation,
      appendMessage,
      updateMessage,
      removeMessage,
      removeConversation,
      removePendingRequest,
      createGroupConversation,
      _setSocket,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};