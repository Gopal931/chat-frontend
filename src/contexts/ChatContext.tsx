import React, { createContext, useState, useCallback, useRef, useMemo, ReactNode } from 'react';
import { Conversation } from '../types/conversation';
import { Message } from '../types/message';
import { User } from '../types/user';
import { FriendRequest } from '../types/friend';
import api from '../api/axios';
import { CONVERSATIONS, MESSAGES, FRIENDS } from '../api/endpoints';
import { Socket } from 'socket.io-client';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  onlineUsers: string[];
  pendingRequests: FriendRequest[];
  connectedUsers: User[];
  fetchConversations: () => Promise<void>;
  fetchConnectedUsers: () => Promise<void>;
  setActiveConversation: (c: Conversation) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
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
  const [loadingMessages, setLoadingMsgs]       = useState(false);

  const activeConvIdRef = useRef<string | null>(null);
  const joinedRoomsRef  = useRef<Set<string>>(new Set());
  const socketRef       = useRef<Socket | null>(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────────
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
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const { data } = await api.get<Message[]>(MESSAGES.GET(conversationId));
      setMessages(data);
    } finally { setLoadingMsgs(false); }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const appendMessage = useCallback((msg: Message) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c._id === msg.conversationId);
      if (idx !== -1) {
        const updated = { ...prev[idx], lastMessage: msg, updatedAt: msg.createdAt };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      }
      // New conversation in sidebar — fetch it
      api.get<Conversation[]>(CONVERSATIONS.GET_ALL)
        .then(({ data: all }) => {
          const found = all.find((c) => c._id === msg.conversationId);
          if (!found) return;
          setConversations((cur) => {
            if (cur.some((c) => c._id === found._id)) return cur;
            return [{ ...found, lastMessage: msg, updatedAt: msg.createdAt }, ...cur];
          });
        }).catch(() => {});
      return prev;
    });
    setMessages((prev) => {
      if (prev.some((m) => m._id === msg._id)) return prev;
      if (activeConvIdRef.current !== msg.conversationId) return prev;
      return [...prev, msg];
    });
  }, []);

  const updateMessage = useCallback((msg: Message) => {
    setMessages((prev) => prev.map((m) => m._id === msg._id ? { ...m, ...msg } : m));
    setConversations((prev) => prev.map((c) => {
      if (c._id !== msg.conversationId) return c;
      if (c.lastMessage?._id === msg._id) return { ...c, lastMessage: { ...c.lastMessage, ...msg } };
      return c;
    }));
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
    setMessages((prev) => activeConvIdRef.current === conversationId ? [] : prev);
  }, []);

  const removePendingRequest = useCallback((requestId: string) => {
    setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
  }, []);

  const setActiveConversation = useCallback((conv: Conversation) => {
    activeConvIdRef.current = conv._id;
    setActiveState(conv);
    const s = socketRef.current;
    if (s && !joinedRoomsRef.current.has(conv._id)) {
      s.emit('join_conversation', conv._id);
      joinedRoomsRef.current.add(conv._id);
    }
  }, []);

  const createGroupConversation = useCallback(async (groupName: string, participantIds: string[]) => {
    const { data } = await api.post<Conversation>(CONVERSATIONS.CREATE, {
      isGroup: true, groupName, participantIds,
    });
    setConversations((prev) => [data, ...prev]);
    setActiveConversation(data);
  }, [setActiveConversation]);

  // ── _setSocket — all listeners use setState functional form (no stale closures) ─
  const _setSocket = useCallback((socket: Socket | null) => {
    if (socketRef.current) {
      socketRef.current.off('receive_message');
      socketRef.current.off('message_edited');
      socketRef.current.off('message_deleted');
      socketRef.current.off('conversation_deleted');
      socketRef.current.off('online_users');
      socketRef.current.off('messages_seen');
      socketRef.current.off('message_delivered');
      socketRef.current.off('friend_request');
      socketRef.current.off('friend_request_updated');
      socketRef.current.off('conversation_created');
      socketRef.current.off('pending_requests');
      socketRef.current.off('connect');
    }

    socketRef.current = socket;
    joinedRoomsRef.current = new Set();
    if (!socket) return;

    socket.on('connect', () => {
      joinedRoomsRef.current.forEach((id) => socket.emit('join_conversation', id));
    });

    // ── New message ────────────────────────────────────────────────────────────
    socket.on('receive_message', (msg: Message) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c._id === msg.conversationId);
        if (idx !== -1) {
          const updated = { ...prev[idx], lastMessage: msg, updatedAt: msg.createdAt };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        }
        api.get<Conversation[]>(CONVERSATIONS.GET_ALL)
          .then(({ data: all }) => {
            const found = all.find((c) => c._id === msg.conversationId);
            if (!found) return;
            setConversations((cur) => {
              if (cur.some((c) => c._id === found._id)) return cur;
              return [{ ...found, lastMessage: msg, updatedAt: msg.createdAt }, ...cur];
            });
          }).catch(() => {});
        return prev;
      });
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        if (activeConvIdRef.current !== msg.conversationId) return prev;
        return [...prev, msg];
      });
    });

    // ── Message edited ─────────────────────────────────────────────────────────
    socket.on('message_edited', (msg: Message) => {
      setMessages((prev) => prev.map((m) => m._id === msg._id ? { ...m, ...msg } : m));
      setConversations((prev) => prev.map((c) => {
        if (c._id !== msg.conversationId) return c;
        if (c.lastMessage?._id === msg._id) return { ...c, lastMessage: { ...c.lastMessage, ...msg } };
        return c;
      }));
    });

    // ── Message deleted ────────────────────────────────────────────────────────
    socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    // ── Conversation deleted ───────────────────────────────────────────────────
    socket.on('conversation_deleted', ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      setActiveState((prev) => {
        if (prev?._id === conversationId) { activeConvIdRef.current = null; return null; }
        return prev;
      });
      setMessages([]);
    });

    // ── Messages seen — update status for all messages in that conversation ────
    socket.on('messages_seen', ({ conversationId }: { conversationId: string; seenBy: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === conversationId && m.status !== 'seen'
            ? { ...m, status: 'seen' as const }
            : m
        )
      );
    });

    // ── Message delivered — update status ──────────────────────────────────────
    socket.on('message_delivered', ({ conversationId }: { conversationId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === conversationId && m.status === 'sent'
            ? { ...m, status: 'delivered' as const }
            : m
        )
      );
    });

    // ── Online users ───────────────────────────────────────────────────────────
    socket.on('online_users', (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    // ── Friend request received ────────────────────────────────────────────────
    socket.on('friend_request', (request: FriendRequest) => {
      setPendingRequests((prev) => {
        if (prev.some((r) => r._id === request._id)) return prev;
        return [request, ...prev];
      });
    });

    // ── Pending requests on connect ────────────────────────────────────────────
    socket.on('pending_requests', (requests: FriendRequest[]) => {
      setPendingRequests(requests);
    });

    // ── Friend request accepted/declined ──────────────────────────────────────
    socket.on('friend_request_updated', ({ requestId, status, conversation }: {
      requestId: string;
      status: string;
      conversation?: Conversation;
    }) => {
      setPendingRequests((prev) => prev.filter((r) => r._id !== requestId));
      if (status === 'accepted' && conversation) {
        setConversations((prev) => {
          if (prev.some((c) => c._id === conversation._id)) return prev;
          return [conversation, ...prev];
        });
        // Also update connected users list
        setConnectedUsers((prev) => {
          const newUser = conversation.participants?.find(
            (p) => !prev.some((u) => u._id === p._id)
          );
          return newUser ? [...prev, newUser] : prev;
        });
      }
    });

    // ── New conversation created (after accept) ────────────────────────────────
    socket.on('conversation_created', (conversation: Conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
      // Join the new room
      socket.emit('join_conversation', conversation._id);
      joinedRoomsRef.current.add(conversation._id);
    });

  }, []); // stable — only uses setState functional forms

  // useMemo — value object sirf tab naya banega jab state change ho
  // Iske bina har render pe naya object banta hai aur sab children re-render hote hain
  const value = useMemo(() => ({
    conversations, activeConversation, messages,
    loadingConversations, loadingMessages, onlineUsers,
    pendingRequests, connectedUsers,
    fetchConversations, fetchConnectedUsers, setActiveConversation,
    fetchMessages, appendMessage, updateMessage, removeMessage,
    removeConversation, setOnlineUsers, removePendingRequest,
    createGroupConversation, _setSocket,
  }), [
    conversations, activeConversation, messages,
    loadingConversations, loadingMessages, onlineUsers,
    pendingRequests, connectedUsers,
    fetchConversations, fetchConnectedUsers, setActiveConversation,
    fetchMessages, appendMessage, updateMessage, removeMessage,
    removeConversation, setOnlineUsers, removePendingRequest,
    createGroupConversation, _setSocket,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};