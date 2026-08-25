import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { MessageStatus as Status } from '@/types/message';
import { cn } from '@/lib/utils';

const MessageStatus: React.FC<{ status: Status; className?: string }> = ({ status, className }) => {
  if (status === 'sent') return <Check size={13} className={cn('text-muted-foreground/80', className)} />;
  if (status === 'delivered') return <CheckCheck size={13} className={cn('text-muted-foreground/80', className)} />;
  if (status === 'seen') return <CheckCheck size={13} className={cn('text-cyan-400', className)} />;
  return null;
};
export default MessageStatus;
