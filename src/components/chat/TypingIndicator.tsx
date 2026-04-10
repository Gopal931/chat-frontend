import React from 'react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import TypingDots from '@/components/shared/TypingDots';

interface Props { conversationId: string | null; }

const TypingIndicator: React.FC<Props> = ({ conversationId }) => {
  const { typingText, isTyping } = useTypingIndicator(conversationId);
  if (!isTyping || !conversationId) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1 animate-fade-in">
      <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2">
        <TypingDots />
        <span className="text-xs text-muted-foreground">{typingText}</span>
      </div>
    </div>
  );
};
export default TypingIndicator;
