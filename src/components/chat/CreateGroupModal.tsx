import React, { useState, useEffect } from 'react';
import { Check, Search, Users, RefreshCw } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { useChat } from '@/hooks/useChat';
import { User } from '@/types/user';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import UserAvatar from '@/components/shared/UserAvatar';

interface Props { open: boolean; onClose: () => void; }

const CreateGroupModal: React.FC<Props> = ({ open, onClose }) => {
  const { createGroupConversation, connectedUsers, refetch } = useConversations();
  const { onlineUsers, fetchConnectedUsers } = useChat();

  const [groupName, setGroupName]   = useState('');
  const [selected, setSelected]= useState<Set<string>>(new Set());
  const [search, setSearch]= useState('');
  const [loading, setLoading]= useState(false);
  const [error, setError]= useState('');

  // Refresh connected users every time modal opens
  useEffect(() => {
    if (open) {
      fetchConnectedUsers();
      setError('');
      setSelected(new Set());
      setGroupName('');
      setSearch('');
    }
  }, [open, fetchConnectedUsers]);

  const filtered = connectedUsers.filter((u): u is User =>
    !!u && (!search || u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (u: User) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(u._id) ? next.delete(u._id) : next.add(u._id);
    return next;
  });

  const handleCreate = async () => {
    if (!groupName.trim()) { setError('Group name is required'); return; }
    if (selected.size < 1) { setError('Select at least 1 member'); return; }

    setLoading(true);
    setError('');
    try {
      await createGroupConversation(groupName.trim(), Array.from(selected));
      onClose();
    } catch (err: unknown) {
      // Show the actual error from API, not a generic message
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Users size={16} className="text-white" />
            </div>
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Group Name</Label>
            <Input
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); setError(''); }}
              placeholder="e.g. Design Team, Friends…"
              maxLength={50}
              className="bg-secondary/50 border-white/10 rounded-xl focus:border-primary/40 h-10"
            />
          </div>

          {/* Selected chips */}
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selected).map((id) => {
                const u = connectedUsers.find((u) => u && u._id === id);
                if (!u) return null;
                return (
                  <span
                    key={id}
                    onClick={() => toggle(u)}
                    className="flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 text-xs font-semibold px-3 py-1 rounded-full cursor-pointer hover:bg-primary/30 transition-colors shadow-xs"
                  >
                    {u.username} ×
                  </span>
                );
              })}
            </div>
          )}

          {/* Member picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Members{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  ({selected.size} selected)
                </span>
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground gap-1 hover:text-foreground"
                onClick={fetchConnectedUsers}
              >
                <RefreshCw size={11} /> Refresh
              </Button>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search connected users…"
                className="pl-8 bg-secondary/50 border-white/10 rounded-xl h-9 text-xs"
              />
            </div>

            <ScrollArea className="h-44 rounded-2xl border border-white/10 bg-secondary/30">
              <div className="p-1.5 space-y-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-6 px-4">
                    {connectedUsers.length === 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground font-medium">No connected users</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          Accept friend requests first, then you can add them to a group.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No users matched "{search}"</p>
                    )}
                  </div>
                ) : (
                  filtered.map((u) => {
                    const isSel = selected.has(u._id);
                    const isOnline = onlineUsers.includes(u._id);
                    return (
                      <button
                        key={u._id}
                        onClick={() => toggle(u)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left',
                          isSel ? 'bg-primary/15 border border-primary/30' : 'hover:bg-white/5 border border-transparent'
                        )}
                      >
                        <UserAvatar username={u.username} avatarUrl={u.avatarUrl} size="sm" isOnline={isOnline} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{u.username}</p>
                          <p className="text-[10px] font-medium">
                            {isOnline ? <span className="text-emerald-400">● Online</span> : <span className="text-muted-foreground">Offline</span>}
                          </p>
                        </div>
                        <div className={cn(
                          'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          isSel ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        )}>
                          {isSel && <Check size={11} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || selected.size < 1}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20"
          >
            {loading ? 'Creating…' : `Create (${selected.size + 1} members)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;