import React from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import { FriendRequest } from '@/types/friend';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/shared/UserAvatar';

interface Props {
  requests: FriendRequest[];
  respondingId: string | null;
  onAccept: (r: FriendRequest) => void;
  onDecline: (r: FriendRequest) => void;
}

const FriendRequestBadge: React.FC<Props> = ({ requests, respondingId, onAccept, onDecline }) => {
  if (requests.length === 0) return null;

  return (
    <div className="mx-2 mb-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md overflow-hidden shadow-lg shadow-indigo-500/10">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-primary/15 bg-primary/10">
        <UserPlus size={14} className="text-primary" />
        <span className="text-xs font-bold text-primary tracking-wide">
          {requests.length} Pending Friend Request{requests.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-white/5 max-h-56 overflow-y-auto scrollbar-hide">
        {requests.map((r) => (
          <div key={r._id} className="flex items-center gap-3 px-3.5 py-3">
            <UserAvatar username={r.from.username} avatarUrl={r.from.avatarUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground">{r.from.username}</p>
              <p className="text-[10px] text-muted-foreground truncate">{r.from.email}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20"
                disabled={respondingId === r._id}
                onClick={() => onAccept(r)}
                title="Accept request"
              >
                <Check size={14} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-xl border-white/10 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={respondingId === r._id}
                onClick={() => onDecline(r)}
                title="Decline request"
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRequestBadge;
