import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, Loader2 } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useConversations';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/api/axios';
import { CONVERSATIONS } from '@/api/endpoints';
import { Conversation } from '@/types/conversation';

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ open, onClose }) => {
  const {
    connectedUsers,
    onlineUsers,
    fetchConnectedUsers,
    hasMoreConnectedUsers,
    loadingMoreConnectedUsers,
    fetchMoreConnectedUsers,
  } = useChat();
  const { setActiveConversation } = useChat();
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetchConnectedUsers();
    }
  }, [open, fetchConnectedUsers]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const filteredFriends = connectedUsers.filter((friend) =>
    friend.username.toLowerCase().includes(search.toLowerCase()) ||
    friend.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectFriend = async (friendId: string) => {
    setStartingId(friendId);
    try {
      const { data } = await api.post<Conversation>(CONVERSATIONS.CREATE, {
        isGroup: false,
        participantId: friendId,
      });

      // Set active conversation and trigger load
      setActiveConversation(data);
      onClose();
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-16 right-3 z-50 w-80 max-h-96 flex flex-col bg-slate-900/95 dark:bg-slate-900/95 text-slate-100 backdrop-blur-2xl border border-indigo-500/30 shadow-2xl rounded-3xl p-3.5 animate-slide-in select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
            <MessageSquare size={15} />
          </div>
          <h3 className="font-bold text-sm text-foreground">New Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="h-6 w-6 rounded-full hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends…"
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-secondary/60 border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/50"
          autoFocus
        />
      </div>

      {/* Friends List */}
      <div
        className="flex-1 overflow-y-auto space-y-1 pr-1 no-scrollbar max-h-60"
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          if (scrollHeight - scrollTop - clientHeight < 40 && hasMoreConnectedUsers && !loadingMoreConnectedUsers) {
            fetchMoreConnectedUsers();
          }
        }}
      >
        {filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-xs">No friends found</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              {search ? 'Try a different search term' : 'Add friends from the People tab'}
            </p>
          </div>
        ) : (
          <>
            {filteredFriends.map((friend) => {
              const isOnline = onlineUsers.includes(friend._id);
              const isStarting = startingId === friend._id;

              return (
                <div
                  key={friend._id}
                  onClick={() => !isStarting && handleSelectFriend(friend._id)}
                  className="flex items-center gap-3 p-2 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors group"
                >
                  <UserAvatar
                    username={friend.username}
                    avatarUrl={friend.avatarUrl}
                    size="sm"
                    isOnline={isOnline}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {friend.username}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium truncate">
                      {isOnline ? (
                        <span className="text-emerald-400 font-semibold">● Online</span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                  {isStarting && (
                    <Loader2 size={14} className="animate-spin text-primary flex-shrink-0" />
                  )}
                </div>
              );
            })}
            {loadingMoreConnectedUsers && (
              <div className="flex justify-center py-2">
                <Loader2 size={14} className="animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NewChatModal;
