import React, { useState, useEffect } from 'react';
import { Menu, MessageSquare } from 'lucide-react';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Conversation } from '@/types/conversation';

const Chat: React.FC = () => {
  const { activeConversation } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (activeConversation) setShowChat(true);
    else setShowChat(false);
  }, [activeConversation]);

  const handleSelectConversation = (_conv: Conversation) => {
    setShowChat(true);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar onSelectConversation={handleSelectConversation} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Chat panel */}
      <div className={`flex-1 flex flex-col overflow-hidden ${showChat ? 'flex' : 'hidden md:flex'}`}>
        <ChatWindow onBack={() => setShowChat(false)} />
      </div>

      {/* Mobile: landing when no chat selected */}
      {!showChat && (
        <div className="md:hidden flex-1 flex flex-col bg-background">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                <MessageSquare size={12} className="text-primary-foreground" />
              </div>
              <span className="text-sm font-bold">CHAT</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-primary/60" />
              </div>
              <p className="text-sm font-semibold text-foreground">Your conversations</p>
              <p className="text-xs text-muted-foreground mt-1">Tap the menu to get started</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
