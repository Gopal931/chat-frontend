import React from 'react';
import { Phone, Video, PhoneOff, PhoneCall } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import UserAvatar from '@/components/shared/UserAvatar';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900/95 text-slate-100 border border-indigo-500/30 shadow-2xl rounded-3xl p-6 flex flex-col items-center text-center animate-slide-in">
        {/* Call Type Indicator Header */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          {isVideo ? <Video size={14} /> : <Phone size={14} />}
          <span>Incoming {isVideo ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* User Avatar with Pulse Ring */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
          <UserAvatar
            username={incomingCall.partner.username}
            avatarUrl={incomingCall.partner.avatarUrl}
            size="lg"
            className="h-24 w-24 border-4 border-slate-800 shadow-xl"
          />
        </div>

        {/* User Name */}
        <h3 className="text-xl font-bold text-foreground mb-1 tracking-tight">
          {incomingCall.partner.username}
        </h3>
        <p className="text-xs text-muted-foreground mb-8">
          {isVideo ? '📹 Video Call' : '📞 Calling…'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={rejectCall}
              className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"
              title="Decline"
            >
              <PhoneOff size={22} />
            </button>
            <span className="text-xs text-muted-foreground font-medium">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={acceptCall}
              className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer animate-bounce"
              title="Accept"
            >
              <PhoneCall size={22} />
            </button>
            <span className="text-xs text-muted-foreground font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
