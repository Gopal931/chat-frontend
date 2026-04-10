import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
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

// ── Scroll helper — container ko bottom par le jao ───────────────────────────
const scrollToBottom = (el: HTMLDivElement | null, smooth = false) => {
  if (!el) return;
  if (smooth) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  } else {
    el.scrollTop = el.scrollHeight;
  }
};

const ChatWindow: React.FC<Props> = ({ onBack }) => {
  const { user }                         = useAuth();
  const { activeConversation, onlineUsers } = useChat();
  const { messages, loadingMessages }    = useMessages(activeConversation?._id ?? null);
  const { socket }                       = useSocket();

  const containerRef  = useRef<HTMLDivElement>(null);
  const convIdRef     = useRef<string | null>(null);  // track active conversation
  const isNewMsgRef   = useRef(false);                // was it a new message (not load)

  const partner       = activeConversation?.participants.find((p) => p._id !== user?._id);
  const displayName   = activeConversation?.isGroup
    ? (activeConversation.groupName || 'Group')
    : (partner?.username || 'Unknown');
  const isPartnerOnline = !activeConversation?.isGroup && partner && onlineUsers.includes(partner._id);

  // Mark messages seen
  useEffect(() => {
    if (!socket || !activeConversation || !user) return;
    socket.emit('message_seen', { conversationId: activeConversation._id, viewerId: user._id });
  }, [activeConversation?._id, socket, user]);

  // ── Conversation switch — jab user sidebar mein click kare ─────────────────
  // loadingMessages: true → false transition pe scroll karo
  // Is waqt messages DOM mein render ho chuke hote hain
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      // Loading khatam — ab DOM mein messages hain
      // setTimeout(0) ek extra tick deta hai taaki React DOM update complete ho
      const t = setTimeout(() => {
        scrollToBottom(containerRef.current, false); // instant
      }, 0);
      return () => clearTimeout(t);
    }
  }, [loadingMessages]); // sirf loadingMessages pe — messages array pe nahi

  // ── New message aaya (send/receive) — smooth scroll ─────────────────────────
  useEffect(() => {
    const currentConvId = activeConversation?._id ?? null;

    if (currentConvId !== convIdRef.current) {
      // Conversation badli — scroll loadingMessages effect handle karega
      convIdRef.current = currentConvId;
      isNewMsgRef.current = false;
      return;
    }

    // Same conversation mein naya message aaya
    if (messages.length > 0 && !loadingMessages) {
      scrollToBottom(containerRef.current, true); // smooth
    }
  }, [messages.length]); // sirf length pe — content change pe nahi

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
        <div className="relative">
          {activeConversation.isGroup
            ? <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center"><Users size={16} className="text-primary" /></div>
            : <UserAvatar username={displayName} size="sm" isOnline={!!isPartnerOnline} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-muted-foreground">
            {activeConversation.isGroup
              ? `${activeConversation.participants.length} members`
              : isPartnerOnline ? '● Online' : 'Last seen recently'
            }
          </p>
        </div>
      </div>

      {/* Messages container — ye hi scroll hoga */}
      <div ref={containerRef} className="flex-1 px-4 py-3 overflow-y-auto">
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