import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const COLORS = [
  'bg-violet-600','bg-cyan-600','bg-emerald-600',
  'bg-rose-600','bg-amber-600','bg-blue-600','bg-pink-600',
];
export const getAvatarColor = (str: string) => COLORS[(str?.charCodeAt(0) ?? 0) % COLORS.length];

interface Props {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showStatus?: boolean; // if false, no dot at all (e.g. group avatars)
  className?: string;
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-28 w-28 text-3xl font-bold md:h-32 md:w-32',
};

const dotMap = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-5 w-5 border-4',
};

const UserAvatar: React.FC<Props> = ({
  username,
  avatarUrl,
  size = 'md',
  isOnline,
  showStatus = true,  // show dot by default
  className,
}) => (
  <div className="relative flex-shrink-0">
    <Avatar className={cn(sizeMap[size], className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={username} className="object-cover h-full w-full" />
      )}
      <AvatarFallback className={cn(getAvatarColor(username), 'text-white font-semibold')}>
        {username ? username.slice(0, 2).toUpperCase() : 'U'}
      </AvatarFallback>
    </Avatar>

    {/* Always show the status dot when showStatus=true */}
    {showStatus && (
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-card',
          dotMap[size],
          isOnline ? 'bg-emerald-500' : 'bg-slate-500'
        )}
      />
    )}
  </div>
);

export default UserAvatar;