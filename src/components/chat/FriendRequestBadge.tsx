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
    <div className="mx-2 mb-2 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10">
        <UserPlus size={13} className="text-primary" />
        <span className="text-xs font-semibold text-primary">
          {requests.length} pending request{requests.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-border/50 max-h-48 overflow-y-auto scrollbar-hide">
        {requests.map((r) => (
          <div key={r._id} className="flex items-center gap-3 px-3 py-2.5">
            <UserAvatar username={r.from.username} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{r.from.username}</p>
              <p className="text-[10px] text-muted-foreground truncate">{r.from.email}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                size="icon"
                className="h-7 w-7 rounded-lg"
                disabled={respondingId === r._id}
                onClick={() => onAccept(r)}
              >
                <Check size={13} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                disabled={respondingId === r._id}
                onClick={() => onDecline(r)}
              >
                <X size={13} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRequestBadge;
