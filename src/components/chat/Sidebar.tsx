import React, { useState } from 'react';
import { Search, LogOut, Plus, MessageSquare, Users, Wifi, WifiOff, Bell, Settings } from 'lucide-react';
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
import UserProfileDrawer from './UserProfileDrawer';
import { Conversation } from '@/types/conversation';

interface Props {
  onSelectConversation?: (conv: Conversation) => void;
  className?: string;
}

type Tab = 'chats' | 'people' | 'Requests';

const SkeletonItem = () => (
  <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
    <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-2.5 bg-muted rounded w-1/2" />
    </div>
  </div>
);

const Sidebar: React.FC<Props> = ({ onSelectConversation, className }) => {
  const { user, logout } = useAuth();
  const { conversations, loadingConversations, activeConversation, setActiveConversation } = useConversations();
  const { onlineUsers, pendingRequests } = useChat();
  const { acceptRequest, declineRequest, respondingId } = useFriends();
  const { socket } = useSocket();
  console.log(pendingRequests);

  const [tab, setTab] = useState<Tab>('chats');
  const [search, setSearch] = useState('');
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [myProfileOpen, setMyProfileOpen] = useState(false);

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
    onSelectConversation?.(conv);
  };

  return (
    <>
      <aside className={cn(
        'w-full h-full flex flex-col bg-card/90 backdrop-blur-xl border-r border-white/10 shadow-2xl overflow-hidden',
        className
      )}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-3 border-b border-white/10 glass-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/30 flex items-center justify-center">
                <MessageSquare size={17} className="text-white" />
              </div>
              <div>
                <span className="font-extrabold text-base text-foreground tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">PULSE</span>
              </div>
            </div>
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/60 border border-white/5 mr-1">
                  <span className={cn("h-2 w-2 rounded-full", socket?.connected ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-slate-500")} />
                  <span className="text-[10px] font-medium text-muted-foreground hidden sm:inline">
                    {socket?.connected ? `${onlineUsers.length} online` : 'offline'}
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10" onClick={() => { setTab('chats'); setGroupModalOpen(true); }}>
                      <Plus size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New group</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-destructive" onClick={logout}>
                      <LogOut size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Logout</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* User pill */}
          <div
            onClick={() => setMyProfileOpen(true)}
            className="flex items-center gap-3 bg-secondary/60 hover:bg-secondary/90 border border-white/10 rounded-2xl p-2.5 cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md"
          >
            <UserAvatar username={user?.username ?? ''} avatarUrl={user?.avatarUrl} size="sm" isOnline />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{user?.username}</p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>●</span> Active now
              </p>
            </div>
            <Settings size={15} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>

          {/* Search — only on chats tab */}
          {tab === 'chats' && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="pl-9 h-9 text-xs bg-secondary/50 border-white/10 rounded-xl focus:border-primary/40"
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 gap-1 border-b border-white/10 bg-secondary/30">
          {(['chats', 'people', 'Requests'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200',
                tab === t
                  ? 'bg-primary text-primary-foreground shadow-md shadow-indigo-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {t === 'chats' ? <MessageSquare size={13} /> : t === 'Requests' ? <Bell size={13} /> : <Users size={13} />}
              {t}
              {t === 'chats' && filteredConvs.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold bg-white/20 text-white border-none">{filteredConvs.length}</Badge>
              )}
              {t === 'Requests' && pendingRequests.length > 0 && (
                <Badge className="h-4 px-1.5 text-[9px] font-bold bg-destructive text-white border-none animate-pulse">{pendingRequests.length}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">

          {tab === 'Requests' && (
            <div className="p-2">
              {pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <Bell size={28} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No pending requests
                  </p>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    When someone sends you a friend request, it will appear here.
                  </p>
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <FriendRequestBadge
                    key={req._id}
                    requests={[req]}
                    respondingId={respondingId}
                    onAccept={acceptRequest}
                    onDecline={declineRequest}
                  />
                ))
              )}
            </div>
          )}
          {tab === 'chats' && (
            <div className="p-2">
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

      <UserProfileDrawer
        open={myProfileOpen}
        onClose={() => setMyProfileOpen(false)}
        userProfile={user}
        isSelf={true}
      />
    </>
  );
};

export default React.memo(Sidebar);