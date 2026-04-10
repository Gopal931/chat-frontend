import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { MessageStatus as Status } from '@/types/message';
import { cn } from '@/lib/utils';

const MessageStatus: React.FC<{ status: Status; className?: string }> = ({ status, className }) => {
  if (status === 'sent') return <Check size={12} className={cn('text-muted-foreground', className)} />;
  if (status === 'delivered') return <CheckCheck size={12} className={cn('text-muted-foreground', className)} />;
  if (status === 'seen') return <CheckCheck size={12} className={cn('text-blue-400', className)} />;
  return null;
};
export default MessageStatus;
