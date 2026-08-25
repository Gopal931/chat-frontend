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
  hasMoreConversations: boolean;
  loadingMoreConversations: boolean;
  fetchMoreConversations: () => Promise<void>;
  hasMoreConnectedUsers: boolean;
  loadingMoreConnectedUsers: boolean;
  fetchMoreConnectedUsers: () => Promise<void>;
  onlineUsers: string[];
  pendingRequests: FriendRequest[];
  connectedUsers: User[];
  fetchConversations: () => Promise<void>;
  fetchConnectedUsers: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchMoreMessages: (conversationId: string) => Promise<void>;
  setActiveConversation: (c: Conversation | null) => void;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [loadingConversations, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMsgs] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [loadingMoreMessages, setLoadingMoreMsgs] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [errorLoadingMore, setErrorLoadingMore] = useState<boolean>(false);

  const [hasMoreConversations, setHasMoreConvs] = useState<boolean>(false);
  const [loadingMoreConversations, setLoadingMoreConvs] = useState<boolean>(false);
  const [nextConvCursor, setNextConvCursor] = useState<string | null>(null);
  const nextConvCursorRef = useRef<string | null>(null);
  const hasMoreConvsRef = useRef<boolean>(false);
  const loadingMoreConvsRef = useRef<boolean>(false);

  const [hasMoreConnectedUsers, setHasMoreConnected] = useState<boolean>(false);
  const [loadingMoreConnectedUsers, setLoadingMoreConnected] = useState<boolean>(false);
  const hasMoreConnectedRef = useRef<boolean>(false);
  const loadingMoreConnectedRef = useRef<boolean>(false);

  const { user } = useAuth();

  const activeConvIdRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef<boolean>(false);
  const loadingMoreRef = useRef<boolean>(false);

  // Always holds latest userId without needing it in deps arrays
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?._id ?? null;

  const connectedUsersRef = useRef<User[]>([]);
  connectedUsersRef.current = connectedUsers;

  // ── FETCHERS
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const { data } = await api.get<{ conversations: Conversation[]; nextCursor: string | null; hasMore: boolean } | Conversation[]>(
        CONVERSATIONS.GET_ALL + '?limit=20'
      );
      const convs = Array.isArray(data) ? data : (data.conversations || []);
      const nextCursor = Array.isArray(data) ? null : data.nextCursor;
      const hasMore = Array.isArray(data) ? false : data.hasMore;

      setConversations((prev) => {
        const prevUnreadMap = new Map(prev.map((c) => [c._id, c.unreadCount || 0]));
        return convs.map((c) => ({
          ...c,
          unreadCount: c.unreadCount ?? prevUnreadMap.get(c._id) ?? 0,
        }));
      });
      setNextConvCursor(nextCursor);
      setHasMoreConvs(hasMore);
      nextConvCursorRef.current = nextCursor;
      hasMoreConvsRef.current = hasMore;
    } finally { setLoadingConvs(false); }
  }, []);

  const fetchMoreConversations = useCallback(async () => {
    if (!hasMoreConvsRef.current || loadingMoreConvsRef.current || !nextConvCursorRef.current) return;
    loadingMoreConvsRef.current = true;
    setLoadingMoreConvs(true);

    try {
      const cursor = nextConvCursorRef.current;
      const { data } = await api.get<{ conversations: Conversation[]; nextCursor: string | null; hasMore: boolean }>(
        `${CONVERSATIONS.GET_ALL}?limit=20&before=${cursor}`
      );
      const newConvs = data.conversations || [];
      const nextCursor = data.nextCursor;
      const hasMore = data.hasMore;

      setConversations((prev) => {
        const existingIds = new Set(prev.map((c) => c._id));
        const filtered = newConvs.filter((c) => !existingIds.has(c._id));
        return [...prev, ...filtered];
      });
      setNextConvCursor(nextCursor);
      setHasMoreConvs(hasMore);
      nextConvCursorRef.current = nextCursor;
      hasMoreConvsRef.current = hasMore;
    } catch (err) {
      console.error('Failed to load more conversations', err);
    } finally {
      loadingMoreConvsRef.current = false;
      setLoadingMoreConvs(false);
    }
  }, []);

  const fetchConnectedUsers = useCallback(async () => {
    try {
      const { data } = await api.get<{ users: User[]; hasMore: boolean } | User[]>(FRIENDS.CONNECTED + '?limit=20&skip=0');
      const users = Array.isArray(data) ? data : (data.users || []);
      const hasMore = Array.isArray(data) ? false : data.hasMore;

      setConnectedUsers(users);
      setHasMoreConnected(hasMore);
      hasMoreConnectedRef.current = hasMore;
    } catch { }
  }, []);

  const fetchMoreConnectedUsers = useCallback(async () => {
    if (!hasMoreConnectedRef.current || loadingMoreConnectedRef.current) return;
    loadingMoreConnectedRef.current = true;
    setLoadingMoreConnected(true);

    try {
      const skip = connectedUsersRef.current.length;
      const { data } = await api.get<{ users: User[]; hasMore: boolean }>(`${FRIENDS.CONNECTED}?limit=20&skip=${skip}`);
      const newUsers = data.users || [];
      const hasMore = data.hasMore;

      setConnectedUsers((prev) => {
        const existingIds = new Set(prev.map((u) => u._id));
        const filtered = newUsers.filter((u) => !existingIds.has(u._id));
        return [...prev, ...filtered];
      });
      setHasMoreConnected(hasMore);
      hasMoreConnectedRef.current = hasMore;
    } catch (err) {
      console.error('Failed to load more friends', err);
    } finally {
      loadingMoreConnectedRef.current = false;
      setLoadingMoreConnected(false);
    }
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

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  // ── INCOMING MESSAGE ──────────────────────────────────────────────────────────
  const handleIncomingMessage = useCallback((msg: Message) => {
    // Move conversation to top of sidebar & update unread count
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === msg.conversationId);
      const isInactive = activeConvIdRef.current !== msg.conversationId;
      const notMyMsg   = userIdRef.current && userIdRef.current !== msg.sender._id;

      if (idx !== -1) {
        const currentUnread = prev[idx].unreadCount || 0;
        const updated = {
          ...prev[idx],
          lastMessage: msg,
          updatedAt: msg.createdAt,
          unreadCount: isInactive && notMyMsg ? currentUnread + 1 : 0,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      }

      // If conversation is not in sidebar list, add active conversation or refresh list
      if (activeConvRef.current && activeConvRef.current._id === msg.conversationId) {
        const newConv: Conversation = {
          ...activeConvRef.current,
          lastMessage: msg,
          updatedAt: msg.createdAt,
          unreadCount: 0,
        };
        return [newConv, ...prev];
      }

      fetchConversations();
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
    const s = socketRef.current;
    const myId = userIdRef.current;
    const inWindow = activeConvIdRef.current === msg.conversationId;
    const notMyMsg = myId && myId !== msg.sender._id;

    if (s && notMyMsg) {
      s.emit('message_delivered', {
        messageId: msg._id,
        conversationId: msg.conversationId,
      });
    }

    if (s && inWindow && notMyMsg) {
      s.emit('message_seen', {
        conversationId: msg.conversationId,
        viewerId: myId,  // ← current user's ID (not sender's, not conv ID)
      });
    }
  }, [fetchConversations]);

  // ── HELPERS ───────────────────────────────────────────────────────────────────
  const appendMessage = useCallback((msg: Message) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === msg.conversationId);
      if (idx !== -1) {
        const updated = { ...prev[idx], lastMessage: msg, updatedAt: msg.createdAt };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      }
      if (activeConvRef.current && activeConvRef.current._id === msg.conversationId) {
        const newConv: Conversation = {
          ...activeConvRef.current,
          lastMessage: msg,
          updatedAt: msg.createdAt,
          unreadCount: 0,
        };
        return [newConv, ...prev];
      }
      fetchConversations();
      return prev;
    });
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, [fetchConversations]);

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
  const setActiveConversation = useCallback((conv: Conversation | null) => {
    if (!conv) {
      activeConvIdRef.current = null;
      activeConvRef.current = null;
      setActiveState(null);
      setMessages([]);
      return;
    }
    activeConvIdRef.current = conv._id;
    activeConvRef.current = conv;
    setActiveState(conv);

    // Clear unread count & update sidebar list if conversation has messages
    setConversations((prev) => {
      const exists = prev.some((c) => c._id === conv._id);
      if (exists) {
        return prev.map((c) => (c._id === conv._id ? { ...c, ...conv, unreadCount: 0 } : c));
      }
      if (conv.lastMessage) {
        return [{ ...conv, unreadCount: 0 }, ...prev];
      }
      return prev;
    });

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
        viewerId: userIdRef.current,
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

      socket.on('user_presence', ({ userId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen?: string | null }) => {
        setOnlineUsers((prev) => {
          if (isOnline) {
            return prev.includes(userId) ? prev : [...prev, userId];
          } else {
            return prev.filter((id) => id !== userId);
          }
        });

        setConversations((prev) =>
          prev.map((c) => ({
            ...c,
            participants: c.participants.map((p) =>
              p._id === userId ? { ...p, isOnline, lastSeen: lastSeen ?? p.lastSeen } : p
            ),
          }))
        );

        setActiveState((prev) => {
          if (!prev) return null;
          if (prev.participants.some((p) => p._id === userId)) {
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p._id === userId ? { ...p, isOnline, lastSeen: lastSeen ?? p.lastSeen } : p
              ),
            };
          }
          return prev;
        });
      });

      socket.on('message_delivered', (data: { messageId: string; conversationId: string; status: string }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            String(msg._id) === String(data.messageId)
              ? { ...msg, status: 'delivered' as const }
              : msg
          )
        );

        setConversations((prev) =>
          prev.map((c) => {
            if (String(c._id) !== String(data.conversationId)) return c;
            if (!c.lastMessage || String(c.lastMessage._id) !== String(data.messageId)) return c;
            return {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                status: 'delivered' as const,
              },
            };
          })
        );
      });

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
                read: true,
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

      socket.on('message_deleted_for_everyone', (data: Message) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === data._id ? { ...m, ...data, isDeletedForEveryone: true, text: '', content: '' } : m))
        );
        setConversations((prev) =>
          prev.map((c) => {
            if (c.lastMessage?._id === data._id) {
              return {
                ...c,
                lastMessage: { ...c.lastMessage, text: 'This message was deleted', content: 'This message was deleted', isDeletedForEveryone: true },
              };
            }
            return c;
          })
        );
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
      hasMoreConversations,
      loadingMoreConversations,
      fetchMoreConversations,
      hasMoreConnectedUsers,
      loadingMoreConnectedUsers,
      fetchMoreConnectedUsers,
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
      hasMoreConversations,
      loadingMoreConversations,
      fetchMoreConversations,
      hasMoreConnectedUsers,
      loadingMoreConnectedUsers,
      fetchMoreConnectedUsers,
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