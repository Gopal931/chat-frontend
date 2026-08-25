import React, { useEffect } from 'react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/conversation';

const Chat: React.FC = () => {
  const { activeConversation, setActiveConversation } = useChat();

  const isChatOpen = !!activeConversation;

  // Handle browser back button on mobile
  useEffect(() => {
    const handlePopState = () => {
      setActiveConversation(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveConversation]);

  const handleSelectConversation = (_conv: Conversation) => {
    window.history.pushState({ chatOpen: true }, '');
  };

  const handleBack = () => {
    setActiveConversation(null);
  };

  return (
    <div className="h-[100dvh] w-screen bg-background flex overflow-hidden">
      {/* Mobile: Full-width Conversation List when no chat selected. Desktop: Fixed width sidebar (320px/384px) */}
      <div className={cn(
        'w-full md:w-80 lg:w-96 flex-shrink-0 h-full flex flex-col border-r border-white/10',
        isChatOpen ? 'hidden md:flex' : 'flex'
      )}>
        <Sidebar onSelectConversation={handleSelectConversation} />
      </div>

      {/* Mobile: Full-width ChatWindow when chat selected. Desktop: Remaining flex-1 chat panel */}
      <div className={cn(
        'flex-1 h-full flex flex-col overflow-hidden min-w-0',
        isChatOpen ? 'flex' : 'hidden md:flex'
      )}>
        <ChatWindow onBack={handleBack} />
      </div>
    </div>
  );
};

export default Chat;
