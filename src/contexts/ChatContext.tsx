import React, {
  createContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  ReactNode
} from 'react';

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
  fetchMessages: (conversationId: string) => Promise<void>;

  setActiveConversation: (c: Conversation) => void;

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

  // ─── STATE ───
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);

  const [loadingConversations, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMsgs] = useState(false);

  // ─── REFS ───
  const activeConvIdRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  // ── FETCHERS ───
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const { data } = await api.get<Conversation[]>(CONVERSATIONS.GET_ALL);
      setConversations(data);
    } finally {
      setLoadingConvs(false);
    }
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

    try {
      const { data } = await api.get<Message[]>(MESSAGES.GET(conversationId));
      setMessages(data);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // ─ CORE LOGIC (Reusable) ──
  const handleIncomingMessage = useCallback((msg: Message) => {

    // Update conversation list
    setConversations(prev => {
      const idx = prev.findIndex(c => c._id === msg.conversationId);

      if (idx !== -1) {
        const updated = {
          ...prev[idx],
          lastMessage: msg,
          updatedAt: msg.createdAt
        };

        return [updated, ...prev.filter((_, i) => i !== idx)];
      }

      return prev;
    });

    // Update messages (only if active chat)
    setMessages(prev => {
      if (prev.some(m => m._id === msg._id)) return prev;
      if (activeConvIdRef.current !== msg.conversationId) return prev;

      return [...prev, msg];
    });

  }, []);

  // ── HELPERS ─-----
  const updateMessage = useCallback((msg: Message) => {
    setMessages(prev =>
      prev.map(m => m._id === msg._id ? { ...m, ...msg } : m)
    );

    setConversations(prev =>
      prev.map(c => {
        if (c._id !== msg.conversationId) return c;

        if (c.lastMessage?._id === msg._id) {
          return {
            ...c,
            lastMessage: { ...c.lastMessage, ...msg }
          };
        }

        return c;
      })
    );
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m._id !== messageId));
  }, []);

  const removeConversation = useCallback((conversationId: string) => {
    setConversations(prev => prev.filter(c => c._id !== conversationId));

    setActiveState(prev => {
      if (prev?._id === conversationId) {
        activeConvIdRef.current = null;
        return null;
      }
      return prev;
    });
   setMessages([]);
  },[]);

  const removePendingRequest = useCallback((requestId: string) => {
    setPendingRequests(prev => prev.filter(r => r._id !== requestId));
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
      isGroup: true,
      groupName,
      participantIds,
    });

    setConversations(prev => [data, ...prev]);
    setActiveConversation(data);
  }, [setActiveConversation]);

  // ─── SOCKET ───
  const _setSocket = useCallback((socket: Socket | null) => {

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
    }

    socketRef.current = socket;
    joinedRoomsRef.current = new Set();

    if (!socket) return;

    socket.on('connect', () => {
      joinedRoomsRef.current.forEach(id => {
        socket.emit('join_conversation', id);
      });     
    });       

    socket.on('receive_message', handleIncomingMessage);

    socket.on('message_edited', updateMessage);

    socket.on('message_deleted', ({ messageId }) => {
      removeMessage(messageId);
    });

    socket.on('online_users', setOnlineUsers);

  }, [handleIncomingMessage, updateMessage, removeMessage]);

  // ─── MEMO ───
  const value = useMemo(() => ({
    conversations,
    activeConversation,
    messages,

    loadingConversations,
    loadingMessages,

    onlineUsers,
    pendingRequests,
    connectedUsers,

    fetchConversations,
    fetchConnectedUsers,
    fetchMessages,

    setActiveConversation,

    updateMessage,
    removeMessage,
    removeConversation,

    setOnlineUsers,
    removePendingRequest,

    createGroupConversation,

    _setSocket,

  }), [
    conversations,
    activeConversation,
    messages,
    loadingConversations,
    loadingMessages,
    onlineUsers,
    pendingRequests,
    connectedUsers,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};