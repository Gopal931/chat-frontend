import React from 'react';
import { X, Phone, Video, PhoneCall, ArrowDownLeft, ArrowUpRight, PhoneMissed, Clock, Calendar } from 'lucide-react';
import UserAvatar from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { useCall } from '@/contexts/CallContext';

export interface CallRecordItem {
  _id: string;
  callId: string;
  caller: { _id: string; username: string; avatarUrl?: string | null };
  receiver: { _id: string; username: string; avatarUrl?: string | null };
  conversationId: string;
  type: 'audio' | 'video';
  status: string;
  startedAt: string;
  endedAt?: string | null;
  duration: number;
}

interface CallDetailsModalProps {
  call: CallRecordItem | null;
  currentUserId: string;
  onClose: () => void;
}

export const CallDetailsModal: React.FC<CallDetailsModalProps> = ({
  call,
  currentUserId,
  onClose,
}) => {
  const { initiateCall } = useCall();

  if (!call) return null;

  const isCaller = call.caller._id === currentUserId;
  const partner = isCaller ? call.receiver : call.caller;
  const isVideo = call.type === 'video';
  const isMissed = call.status === 'MISSED';
  const isDeclined = call.status === 'REJECTED';

  const formatDuration = (sec: number) => {
    if (sec <= 0) return isMissed ? 'Missed Call' : isDeclined ? 'Declined' : 'No Answer';
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const handleCallAgain = () => {
    onClose();
    initiateCall(
      { _id: partner._id, username: partner.username, avatarUrl: partner.avatarUrl },
      call.conversationId,
      call.type
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900/95 text-slate-100 border border-indigo-500/30 shadow-2xl rounded-3xl p-5 flex flex-col items-center animate-slide-in relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-7 w-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X size={15} />
        </button>

        {/* Title */}
        <h3 className="font-bold text-sm text-foreground mb-4">Call Details</h3>

        {/* Partner Avatar */}
        <UserAvatar
          username={partner.username}
          avatarUrl={partner.avatarUrl}
          size="lg"
          className="h-20 w-20 border-2 border-indigo-500/30 shadow-xl mb-3"
        />

        {/* Partner Name */}
        <h4 className="text-lg font-bold text-foreground mb-1 tracking-tight">
          {partner.username}
        </h4>

        {/* Call Type Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold mb-5">
          {isVideo ? <Video size={13} /> : <Phone size={13} />}
          <span>{isVideo ? 'Video Call' : 'Voice Call'}</span>
        </div>

        {/* Info Grid */}
        <div className="w-full bg-secondary/40 border border-white/10 rounded-2xl p-3.5 space-y-3 mb-6 text-xs">
          {/* Direction */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Type</span>
            <div className="flex items-center gap-1 font-semibold">
              {isMissed ? (
                <span className="flex items-center gap-1 text-red-400">
                  <PhoneMissed size={13} /> Missed Call
                </span>
              ) : isCaller ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <ArrowUpRight size={13} /> Outgoing
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sky-400">
                  <ArrowDownLeft size={13} /> Incoming
                </span>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Calendar size={13} /> Date
            </span>
            <span className="font-medium text-foreground">
              {formatDate(call.startedAt)} at {formatTime(call.startedAt)}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Clock size={13} /> Duration
            </span>
            <span className="font-bold text-foreground">{formatDuration(call.duration)}</span>
          </div>
        </div>

        {/* Call Again Button */}
        <Button
          onClick={handleCallAgain}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          <PhoneCall size={15} />
          <span>Call Again</span>
        </Button>
      </div>
    </div>
  );
};

export default CallDetailsModal;
