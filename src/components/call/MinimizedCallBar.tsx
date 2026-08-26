import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2 } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import UserAvatar from '@/components/shared/UserAvatar';

export const MinimizedCallBar: React.FC = () => {
  const {
    callSession,
    isMinimized,
    maximizeCall,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall,
    cancelCall,
  } = useCall();

  if (!callSession || !isMinimized) return null;

  const isVideo = callSession.type === 'video';

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (callSession.error) return callSession.error;
    switch (callSession.status) {
      case 'CALLING':
        return 'Calling…';
      case 'RINGING':
        return 'Ringing…';
      case 'CONNECTING':
        return 'Connecting…';
      case 'CONNECTED':
        return formatDuration(callSession.duration);
      default:
        return isVideo ? 'Video Call' : 'Voice Call';
    }
  };

  const handleEndOrCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (callSession.status === 'CALLING' && callSession.isCaller) {
      cancelCall();
    } else {
      endCall();
    }
  };

  return (
    <div
      onClick={maximizeCall}
      className="fixed bottom-4 right-4 z-40 w-80 md:w-96 bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-xl rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-indigo-500/70 transition-all animate-slide-in select-none group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex-shrink-0">
          <UserAvatar
            username={callSession.partner.username}
            avatarUrl={callSession.partner.avatarUrl}
            size="sm"
          />
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {callSession.partner.username}
            </p>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0">
              {isVideo ? 'Video' : 'Voice'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold truncate mt-0.5">
            {getStatusText()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isMuted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-slate-300 hover:text-white'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={15} /> : <Mic size={15} />}
        </button>

        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCamera();
            }}
            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isCameraOff ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? <VideoOff size={15} /> : <Video size={15} />}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            maximizeCall();
          }}
          className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Maximize call screen"
        >
          <Maximize2 size={14} />
        </button>

        <button
          type="button"
          onClick={handleEndOrCancel}
          className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
          title="End Call"
        >
          <PhoneOff size={14} />
        </button>
      </div>
    </div>
  );
};

export default MinimizedCallBar;
