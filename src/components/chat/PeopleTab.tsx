import React, { useState } from 'react';
import { Search, UserPlus, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/shared/UserAvatar';
import { useChat } from '@/hooks/useChat';

const PeopleTab: React.FC = () => {
  const { onlineUsers } = useChat();
  const {
    searchResult, searching, searchError,
    sendingId, respondingId,
    searchByEmail, sendRequest, acceptRequest, declineRequest,
  } = useFriends();

  const [email, setEmail] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchByEmail(email);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Search form */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 px-1">
          Search by email to find and connect with someone.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address…"
              type="email"
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button type="submit" size="sm" disabled={searching || !email.trim()} className="h-9">
            {searching ? <Loader2 size={13} className="animate-spin" /> : 'Search'}
          </Button>
        </form>
      </div>

      {/* Error */}
      {searchError && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="text-destructive flex-shrink-0" />
          <p className="text-xs text-destructive">{searchError}</p>
        </div>
      )}

      {/* Result */}
      {searchResult && (
        <div className="rounded-2xl border border-white/10 glass-card p-3.5 shadow-lg">
          <div className="flex items-center gap-3">
            <UserAvatar
              username={searchResult.username}
              avatarUrl={searchResult.avatarUrl}
              size="md"
              isOnline={onlineUsers.includes(searchResult._id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-foreground">{searchResult.username}</p>
              <p className="text-xs text-muted-foreground truncate">{searchResult.email}</p>
              <p className="text-[10px] font-semibold mt-0.5">
                {onlineUsers.includes(searchResult._id)
                  ? <span className="text-emerald-400">● Online</span>
                  : <span className="text-muted-foreground">Offline</span>
                }
              </p>
            </div>

            {searchResult.relationship === 'FRIENDS' && (
              <Button size="sm" variant="secondary" disabled className="flex-shrink-0 gap-1.5 rounded-xl border border-white/10">
                <CheckCircle2 size={13} className="text-emerald-400" /> Friends
              </Button>
            )}

            {searchResult.relationship === 'REQUEST_SENT' && (
              <Button size="sm" variant="secondary" disabled className="flex-shrink-0 gap-1.5 rounded-xl border border-white/10">
                <CheckCircle2 size={13} className="text-indigo-400" /> Request Sent
              </Button>
            )}

            {searchResult.relationship === 'REQUEST_RECEIVED' && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  size="sm"
                  disabled={respondingId === searchResult.requestId}
                  onClick={() => searchResult.requestId && acceptRequest(searchResult.requestId)}
                  className="h-8 px-3 text-xs rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20"
                >
                  {respondingId === searchResult.requestId ? <Loader2 size={12} className="animate-spin" /> : 'Accept'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={respondingId === searchResult.requestId}
                  onClick={() => searchResult.requestId && declineRequest(searchResult.requestId)}
                  className="h-8 px-3 text-xs rounded-xl border-white/10 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Decline
                </Button>
              </div>
            )}

            {searchResult.relationship === 'NOT_FRIENDS' && (
              <Button
                size="sm"
                disabled={sendingId === searchResult._id}
                onClick={() => sendRequest(searchResult._id)}
                className="flex-shrink-0 gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20"
              >
                {sendingId === searchResult._id ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <><UserPlus size={13} /> Send Request</>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {!searchResult && !searchError && !searching && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Search size={28} className="text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">Search for a user by email</p>
          <p className="text-xs text-muted-foreground/60 mt-1">They'll receive a chat request</p>
        </div>
      )}
    </div>
  );
};

export default PeopleTab;
