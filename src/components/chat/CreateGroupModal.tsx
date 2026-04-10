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
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={18} className="text-primary" /> New Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group name */}
          <div className="space-y-1.5">
            <Label>Group name</Label>
            <Input
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); setError(''); }}
              placeholder="e.g. Design Team…"
              maxLength={50}
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
                    className="flex items-center gap-1 bg-primary/20 text-primary text-xs px-2.5 py-1 rounded-full cursor-pointer hover:bg-primary/30 transition-colors"
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
              <Label>
                Members{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  ({selected.size} selected)
                </span>
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground gap-1"
                onClick={fetchConnectedUsers}
              >
                <RefreshCw size={11} /> Refresh
              </Button>
            </div>

            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search connected users…"
                className="pl-8"
              />
            </div>

            <ScrollArea className="h-44 rounded-lg border border-border">
              <div className="p-1 space-y-0.5">
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
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                          isSel ? 'bg-primary/10' : 'hover:bg-accent'
                        )}
                      >
                        <UserAvatar username={u.username} size="sm" isOnline={isOnline} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{u.username}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {isOnline ? '● Online' : 'Offline'}
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
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !groupName.trim() || selected.size < 1}
          >
            {loading ? 'Creating…' : `Create (${selected.size + 1} members)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;