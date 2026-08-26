import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, ArrowLeft, RefreshCw } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import UserAvatar from '@/components/shared/UserAvatar';

export const VideoCallModal: React.FC = () => {
  const {
    callSession,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isMinimized,
    minimizeCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    endCall,
    cancelCall,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!callSession || callSession.type !== 'video' || isMinimized) return null;

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
      case 'REJECTED':
        return 'Call declined';
      case 'MISSED':
        return 'Missed video call';
      case 'ENDED':
        return 'Call ended';
      default:
        return 'Video Call';
    }
  };

  const handleEndOrCancel = () => {
    if (callSession.status === 'CALLING' && callSession.isCaller) {
      cancelCall();
    } else {
      endCall();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-slate-100 animate-fade-in select-none">
      {/* Top Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <button
          type="button"
          onClick={minimizeCall}
          className="flex items-center gap-2 text-sm text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="font-bold">{callSession.partner.username}</span>
        </button>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-600/80 text-white shadow-md">
          {getStatusText()}
        </span>
      </div>

      {/* Main Remote Video Container */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Fallback Remote Avatar if no video feed yet */}
        {(!remoteStream || remoteStream.getVideoTracks().length === 0 || callSession.status !== 'CONNECTED') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center p-6">
            <UserAvatar
              username={callSession.partner.username}
              avatarUrl={callSession.partner.avatarUrl}
              size="lg"
              className="h-28 w-28 border-4 border-indigo-500/30 shadow-2xl mb-4"
            />
            <h3 className="text-xl font-bold text-foreground mb-1">
              {callSession.partner.username}
            </h3>
            <p className="text-sm font-semibold text-emerald-400">{getStatusText()}</p>
          </div>
        )}

        {/* PIP Local Video Preview (Top Right / Bottom Right) */}
        <div className="absolute bottom-24 right-4 z-20 w-28 h-40 md:w-36 md:h-52 rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl bg-slate-900">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'}`}
          />
          {isCameraOff && (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
              <VideoOff size={20} className="mb-1" />
              <span className="text-[10px]">Camera Off</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-6 p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        {/* Mute Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/30 text-red-400 border border-red-500/50 hover:bg-red-500/40'
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <span className="text-xs text-slate-300 font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
        </div>

        {/* Camera Toggle Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={toggleCamera}
            className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              isCameraOff
                ? 'bg-red-500/30 text-red-400 border border-red-500/50 hover:bg-red-500/40'
                : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md'
            }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? <VideoOff size={22} /> : <VideoIcon size={22} />}
          </button>
          <span className="text-xs text-slate-300 font-medium">
            {isCameraOff ? 'Camera On' : 'Camera Off'}
          </span>
        </div>

        {/* Switch Camera Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={switchCamera}
            className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer bg-white/20 hover:bg-white/30 text-white backdrop-blur-md"
            title="Switch Camera (Front/Back)"
          >
            <RefreshCw size={22} />
          </button>
          <span className="text-xs text-slate-300 font-medium">Switch</span>
        </div>

        {/* End Call Button */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleEndOrCancel}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff size={22} />
          </button>
          <span className="text-xs text-slate-300 font-medium">End</span>
        </div>
      </div>
    </div>
  );
};

export default VideoCallModal;
