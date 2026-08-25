import React, { useState } from 'react';
import { Trash2, Users } from 'lucide-react';
import { Conversation } from '@/types/conversation';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import UserAvatar from '@/components/shared/UserAvatar';
import api from '@/api/axios';
import { CONVERSATIONS } from '@/api/endpoints';

interface Props { conversation: Conversation; isActive: boolean; onClick: () => void; }

const formatTime = (d: string) => {
  const date = new Date(d), now = new Date(), diff = now.getTime() - date.getTime();
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ConversationItem: React.FC<Props> = ({ conversation, isActive, onClick }) => {
  const { user } = useAuth();
  const { onlineUsers } = useChat();
  const [deleting, setDeleting] = useState(false);

  const isGroup = conversation.isGroup;
  const other = conversation.participants.find((p) => p._id !== user?._id);
  const displayName = isGroup ? (conversation.groupName || 'Group') : (other?.username || 'Unknown');
  const isOnline = !isGroup && other && onlineUsers.includes(other._id);
  const lastMsg = conversation.lastMessage?.content ?? conversation.lastMessage?.text ?? null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this chat for yourself? Your friend relationship and their chat will remain.')) return;
    setDeleting(true);
    try { await api.delete(CONVERSATIONS.DELETE(conversation._id)); }
    catch { setDeleting(false); }
  };

  return (
    <div
      onClick={!deleting ? onClick : undefined}
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-200 group relative overflow-hidden',
        isActive
          ? 'bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 shadow-md shadow-primary/5'
          : 'hover:bg-secondary/60 border border-transparent hover:border-white/5',
        deleting && 'opacity-40 pointer-events-none'
      )}
    >
      {/* Active Indicator Bar */}
      {isActive && (
        <span className="absolute left-0 inset-y-2 w-1.5 bg-gradient-to-b from-violet-500 to-indigo-600 rounded-r-full shadow-[0_0_10px_#6366f1]" />
      )}

      {/* Avatar */}
      {isGroup
        ? <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0"><Users size={18} className="text-primary" /></div>
        : <UserAvatar username={displayName} avatarUrl={other?.avatarUrl} size="md" isOnline={!!isOnline} />
      }

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn('text-sm font-bold truncate transition-colors', isActive ? 'text-primary font-bold' : 'text-foreground group-hover:text-white')}>{displayName}</span>
          {conversation.lastMessage && (
            <span className={cn('text-[11px] ml-2 flex-shrink-0 font-medium', (conversation.unreadCount ?? 0) > 0 && !isActive ? 'text-primary font-bold' : 'text-muted-foreground')}>
              {formatTime(conversation.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className={cn('text-xs truncate flex-1', (conversation.unreadCount ?? 0) > 0 && !isActive ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
            {lastMsg ?? <span className="italic">No messages yet</span>}
          </p>
          {(conversation.unreadCount ?? 0) > 0 && !isActive && (
            <span className="bg-primary text-primary-foreground font-extrabold text-[10px] min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-md flex-shrink-0 animate-pulse">
              {conversation.unreadCount! > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Delete on hover */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button title="Delete conversation" className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
            <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive gap-2">
            <Trash2 size={13} /> Delete Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
export default ConversationItem;
