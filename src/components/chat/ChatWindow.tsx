import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useMessages } from '@/hooks/useMessages';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import UserAvatar from '@/components/shared/UserAvatar';
import UserProfileDrawer from './UserProfileDrawer';
import { formatLastSeen } from '@/utils/formatLastSeen';

interface Props { onBack?: () => void; }

const MessageSkeleton = () => (
  <div className="flex flex-col gap-4 p-4 animate-pulse">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={cn('flex gap-2', i % 2 === 0 ? '' : 'flex-row-reverse')}>
        <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
        <div className={cn('h-10 rounded-2xl bg-muted', i % 2 === 0 ? 'w-48' : 'w-36')} />
      </div>
    ))}
  </div>
);

const EmptyState = () => (
  <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center select-none p-8">
    <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
      <Users size={32} className="text-primary/60" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">Welcome to Pulse</h3>
    <p className="text-sm text-muted-foreground">Select a conversation or start a new one from the sidebar</p>
  </div>
);

// ── Scroll helper — container ko bottom par le jao ────────
const scrollToBottom = (el: HTMLDivElement | null, smooth = false) => {
  if (!el) return;
  if (smooth) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  } else {
    el.scrollTop = el.scrollHeight;
  }
};

const ChatWindow: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const { activeConversation, onlineUsers } = useChat();
  const {
    messages,
    loadingMessages,
    hasMoreMessages,
    loadingMoreMessages,
    fetchMoreMessages,
  } = useMessages(activeConversation?._id ?? null);
  const { socket } = useSocket();

  const containerRef           = useRef<HTMLDivElement>(null);
  const activeConvIdRef        = useRef<string | null>(null);
  const prevScrollHeightRef    = useRef<number>(0);
  const prevScrollTopRef       = useRef<number>(0);
  const isPrependingRef        = useRef<boolean>(false);
  const initialScrollDoneRef   = useRef<boolean>(false);
  const prevMessageCountRef    = useRef<number>(0);

  const partner = activeConversation?.participants.find((p) => p._id !== user?._id);
  const displayName = activeConversation?.isGroup
    ? (activeConversation.groupName || 'Group')
    : (partner?.username || 'Unknown');
  const isPartnerOnline = !activeConversation?.isGroup && partner && onlineUsers.includes(partner._id);

  // Mark messages seen
  useEffect(() => {
    if (!socket || !activeConversation || !user) return;
    socket.emit('messages_seen', { conversationId: activeConversation._id, viewerId: user._id });
  }, [activeConversation?._id, socket, user]);
  
  // ── 1. Conversation switch & Initial Load ─────────────────────────────────
  useEffect(() => {
    if (!activeConversation) return;

    // Check if active conversation changed
    if (activeConvIdRef.current !== activeConversation._id) {
      activeConvIdRef.current = activeConversation._id;
      isPrependingRef.current = false;
      initialScrollDoneRef.current = false;
      prevMessageCountRef.current = 0;
      return;
    }

    // Perform initial scroll to bottom ONLY ONCE when initial batch finishes loading
    if (!loadingMessages && messages.length > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      prevMessageCountRef.current = messages.length;
      requestAnimationFrame(() => {
        scrollToBottom(containerRef.current, false); // instant scroll to bottom for new conversation
      });
    }
  }, [activeConversation?._id, loadingMessages, messages.length]);

  // ── 2. Scroll position preservation when prepending older messages ───────────
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isPrependingRef.current) {
      const newScrollHeight = container.scrollHeight;
      const heightDiff = newScrollHeight - prevScrollHeightRef.current;
      container.scrollTop = prevScrollTopRef.current + heightDiff;

      isPrependingRef.current = false;
      prevMessageCountRef.current = messages.length;
    }
  }, [messages]);

  // ── 3. Realtime / Outgoing New Messages ─────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loadingMessages || !initialScrollDoneRef.current) return;

    // Only trigger when new message(s) are appended (messages count increased and NOT prepending)
    if (messages.length > prevMessageCountRef.current && !isPrependingRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isMyMsg = lastMsg?.sender?._id === user?._id;

      // Check if user was near bottom (within 200px)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isNearBottom = distanceFromBottom <= 200;

      if (isMyMsg || isNearBottom) {
        scrollToBottom(container, true); // smooth scroll to bottom for new message
      }

      prevMessageCountRef.current = messages.length;
    }
  }, [messages, loadingMessages, user?._id]);

  // ── 4. Top scroll threshold handler for fetching older messages ─────────────
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (
      el.scrollTop <= 200 &&
      hasMoreMessages &&
      !loadingMoreMessages &&
      !loadingMessages &&
      !isPrependingRef.current
    ) {
      if (activeConversation) {
        prevScrollHeightRef.current = el.scrollHeight;
        prevScrollTopRef.current = el.scrollTop;
        isPrependingRef.current = true;
        fetchMoreMessages(activeConversation._id);
      }
    }
  };

  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  if (!activeConversation) return <EmptyState />;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={onBack}>
            <ArrowLeft size={18} />
          </Button>
        )}
        <div
          onClick={() => !activeConversation.isGroup && partner && setShowProfileDrawer(true)}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="relative">
            {activeConversation.isGroup
              ? <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center"><Users size={16} className="text-primary" /></div>
              : <UserAvatar username={displayName} avatarUrl={partner?.avatarUrl} size="sm" isOnline={!!isPartnerOnline} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground">
              {activeConversation.isGroup
                ? `${activeConversation.participants.length} members`
                : formatLastSeen(partner?.lastSeen, !!isPartnerOnline)
              }
            </p>
          </div>
        </div>
      </div>

      <UserProfileDrawer
        open={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        userProfile={partner ? { ...partner, isOnline: !!isPartnerOnline } : null}
        isSelf={false}
      />

      {/* Messages container — ye hi scroll hoga */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 px-4 py-3 overflow-y-auto">
        {loadingMoreMessages && (
          <div className="flex items-center justify-center gap-2 py-2 mb-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Loading older messages...</span>
          </div>
        )}

        {loadingMessages
          ? <MessageSkeleton />
          : messages.length === 0
            ? (
              <div className="flex items-center justify-center h-full py-20">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">No messages yet</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Send the first message!</p>
                </div>
              </div>
            )
            : (
              <div className="space-y-1 pb-2">
                {messages.map((msg, i) => {
                  const prev = messages[i - 1];
                  const next = messages[i + 1];
                  const showAvatar    = !prev || prev.sender._id !== msg.sender._id;
                  const isLastInGroup = !next || next.sender._id !== msg.sender._id;
                  const msgDate  = new Date(msg.createdAt).toDateString();
                  const prevDate = prev ? new Date(prev.createdAt).toDateString() : null;
                  const showDate = msgDate !== prevDate;
                  return (
                    <React.Fragment key={msg._id}>
                      {showDate && (
                        <div className="flex items-center justify-center py-3">
                          <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {new Date(msg.createdAt).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div className={isLastInGroup ? 'mb-3' : 'mb-0.5'}>
                        <MessageBubble message={msg} showAvatar={showAvatar} />
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )
        }
      </div>

      <TypingIndicator conversationId={activeConversation._id} />
      <MessageInput conversationId={activeConversation._id} />
    </div>
  );
};

export default React.memo(ChatWindow);