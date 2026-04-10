import React, { useState } from 'react';
import { Search, LogOut, Plus, MessageSquare, Users, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { useFriends } from '@/hooks/useFriends';
import { useSocket } from '@/hooks/useSocket';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import ConversationItem from './ConversationItem';
import CreateGroupModal from './CreateGroupModal';
import FriendRequestBadge from './FriendRequestBadge';
import PeopleTab from './PeopleTab';
import UserAvatar from '@/components/shared/UserAvatar';
import { Conversation } from '@/types/conversation';

interface Props {
  onSelectConversation: (conv: Conversation) => void;
  mobileOpen: boolean;
  onClose: () => void;
}

type Tab = 'chats' | 'people';

const SkeletonItem = () => (
  <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
    <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-2.5 bg-muted rounded w-1/2" />
    </div>
  </div>
);

const Sidebar: React.FC<Props> = ({ onSelectConversation, mobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { conversations, loadingConversations, activeConversation, setActiveConversation } = useConversations();
  const { onlineUsers, pendingRequests } = useChat();
  const { acceptRequest, declineRequest, respondingId } = useFriends();
  const { socket } = useSocket();

  const [tab, setTab] = useState<Tab>('chats');
  const [search, setSearch] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);

  const filteredConvs = conversations
    .filter((c) => {
      if (!search) return true;
      const other = c.participants.find((p) => p._id !== user?._id);
      const name = c.isGroup ? c.groupName : other?.username;
      return name?.toLowerCase().includes(search.toLowerCase());
    });
  // Already sorted by backend (updatedAt desc), preserve that order

  const handleConvClick = (conv: Conversation) => {
    setActiveConversation(conv);
    onSelectConversation(conv);
    onClose();
  };

  return (
    <>
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-80 flex flex-col bg-card border-r border-border',
        'transition-transform duration-300 md:relative md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <MessageSquare size={15} className="text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground tracking-tight">Pulse</span>
            </div>
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 mr-1">
                  {socket?.connected
                    ? <Wifi size={12} className="text-emerald-500" />
                    : <WifiOff size={12} className="text-muted-foreground" />}
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">
                    {socket?.connected ? `${onlineUsers.length} online` : 'offline'}
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTab('chats'); setGroupModalOpen(true); }}>
                      <Plus size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New group</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout}>
                      <LogOut size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Logout</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* User pill */}
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
            <UserAvatar username={user?.username ?? ''} size="sm" isOnline />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              <p className="text-[10px] text-emerald-500 font-medium">● Active now</p>
            </div>
          </div>

          {/* Search — only on chats tab */}
          {tab === 'chats' && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="pl-8 h-8 text-sm bg-secondary border-transparent"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['chats', 'people'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold capitalize transition-colors',
                tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'chats' ? <MessageSquare size={12} /> : <Users size={12} />}
              {t}
              {t === 'chats' && filteredConvs.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{filteredConvs.length}</Badge>
              )}
              {t === 'people' && pendingRequests.length > 0 && (
                <Badge className="h-4 px-1.5 text-[10px]">{pendingRequests.length}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {tab === 'chats' && (
            <div className="p-2">
              {/* Pending friend requests shown at top of chats */}
              <FriendRequestBadge
                requests={pendingRequests}
                respondingId={respondingId}
                onAccept={acceptRequest}
                onDecline={declineRequest}
              />

              {loadingConversations
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)
                : filteredConvs.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                      <MessageSquare size={28} className="text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {search ? 'No chats found' : 'No chats yet'}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mb-4">
                        {search ? `Nothing matched "${search}"` : 'Go to People and find someone to chat with'}
                      </p>
                      {!search && (
                        <Button variant="outline" size="sm" onClick={() => setTab('people')} className="text-xs">
                          Find people →
                        </Button>
                      )}
                    </div>
                  )
                  : filteredConvs.map((conv) => (
                    <ConversationItem
                      key={conv._id}
                      conversation={conv}
                      isActive={activeConversation?._id === conv._id}
                      onClick={() => handleConvClick(conv)}
                    />
                  ))
              }
            </div>
          )}

          {tab === 'people' && <PeopleTab />}
        </ScrollArea>
      </aside>

      <CreateGroupModal
        open={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
      />
    </>
  );
};

export default React.memo(Sidebar);