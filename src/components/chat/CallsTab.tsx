import React, { useEffect, useState, useCallback } from 'react';
import { Phone, Video, PhoneMissed, ArrowUpRight, ArrowDownLeft, PhoneCall, Loader2, Calendar } from 'lucide-react';
import api from '@/api/axios';
import { CALLS } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import UserAvatar from '@/components/shared/UserAvatar';
import CallDetailsModal, { CallRecordItem } from '@/components/call/CallDetailsModal';

const formatCallTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (sec: number, isMissed: boolean) => {
  if (isMissed) return 'Missed';
  if (sec <= 0) return '00:00';
  const mins = Math.floor(sec / 60);
  const remainingSecs = sec % 60;
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
};

const getDateHeader = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const callDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (callDate.getTime() === today.getTime()) return 'Today';
  if (callDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const CallsTab: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecordItem | null>(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CallRecordItem[]>(CALLS.GET_ALL);
      setCalls(data || []);
    } catch (err) {
      console.error('Failed to fetch call history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 size={24} className="animate-spin text-primary mb-2" />
        <p className="text-xs text-muted-foreground">Loading call history…</p>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center select-none">
        <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
          <PhoneCall size={22} className="text-primary/60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mb-1">No call history</p>
        <p className="text-xs text-muted-foreground/60">
          Calls you make or receive will appear here.
        </p>
      </div>
    );
  }

  // Group calls by date header
  const groupedCalls = calls.reduce<Record<string, CallRecordItem[]>>((acc, call) => {
    const header = getDateHeader(call.startedAt);
    if (!acc[header]) acc[header] = [];
    acc[header].push(call);
    return acc;
  }, {});

  return (
    <div className="p-2 space-y-4 select-none">
      {Object.entries(groupedCalls).map(([dateHeader, callGroup]) => (
        <div key={dateHeader}>
          <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <Calendar size={12} />
            <span>{dateHeader}</span>
          </div>

          <div className="space-y-1">
            {callGroup.map((call) => {
              const isCaller = call.caller._id === user?._id;
              const partner = isCaller ? call.receiver : call.caller;
              const isVideo = call.type === 'video';
              const isMissed = call.status === 'MISSED';

              return (
                <div
                  key={call._id}
                  onClick={() => setSelectedCall(call)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      username={partner.username}
                      avatarUrl={partner.avatarUrl}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {partner.username}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px]">
                        {isMissed ? (
                          <span className="flex items-center gap-1 text-red-400 font-semibold">
                            <PhoneMissed size={12} /> Missed {isVideo ? 'video' : 'voice'}
                          </span>
                        ) : isCaller ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <ArrowUpRight size={12} /> Outgoing {isVideo ? 'video' : 'voice'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sky-400 font-medium">
                            <ArrowDownLeft size={12} /> Incoming {isVideo ? 'video' : 'voice'}
                          </span>
                        )}

                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-muted-foreground font-medium">
                          {formatDuration(call.duration, isMissed)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {formatCallTime(call.startedAt)}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-secondary/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      {isVideo ? <Video size={14} /> : <Phone size={14} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Call Details Modal */}
      {selectedCall && (
        <CallDetailsModal
          call={selectedCall}
          currentUserId={user?._id || ''}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
};

export default CallsTab;
