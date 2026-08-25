import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const GRADIENTS = [
  'bg-gradient-to-tr from-violet-600 to-indigo-600',
  'bg-gradient-to-tr from-cyan-600 to-blue-600',
  'bg-gradient-to-tr from-emerald-600 to-teal-600',
  'bg-gradient-to-tr from-rose-600 to-pink-600',
  'bg-gradient-to-tr from-amber-600 to-orange-600',
  'bg-gradient-to-tr from-purple-600 to-indigo-600',
];
export const getAvatarColor = (str: string) => GRADIENTS[(str?.charCodeAt(0) ?? 0) % GRADIENTS.length];

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
  sm: 'h-2.5 w-2.5 border-2',
  md: 'h-3 w-3 border-2',
  lg: 'h-3.5 w-3.5 border-2',
  xl: 'h-6 w-6 border-4',
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
    <Avatar className={cn(sizeMap[size], 'shadow-md border border-white/10', className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={username} className="object-cover h-full w-full" />
      )}
      <AvatarFallback className={cn(getAvatarColor(username), 'text-white font-bold tracking-wider')}>
        {username ? username.slice(0, 2).toUpperCase() : 'U'}
      </AvatarFallback>
    </Avatar>

    {/* Always show the status dot when showStatus=true */}
    {showStatus && (
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-card transition-all duration-300',
          dotMap[size],
          isOnline
            ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
            : 'bg-slate-500/80'
        )}
      />
    )}
  </div>
);

export default UserAvatar;