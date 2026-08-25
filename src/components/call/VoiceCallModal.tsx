import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, ArrowLeft } from 'lucide-react';
import { useCall } from '@/contexts/CallContext';
import UserAvatar from '@/components/shared/UserAvatar';

export const VoiceCallModal: React.FC = () => {
  const {
    callSession,
    remoteStream,
    isMuted,
    toggleMute,
    endCall,
    cancelCall,
  } = useCall();

  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = !isSpeakerOn;
      remoteAudioRef.current.volume = 1.0;
      remoteAudioRef.current.play().catch((err) => {
        console.warn('[remoteAudio.play() autoplay block/warning]', err);
      });
    }
  }, [remoteStream, isSpeakerOn]);

  if (!callSession || callSession.type !== 'audio') return null;

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
        return 'Missed call';
      case 'ENDED':
        return 'Call ended';
      default:
        return 'Voice Call';
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
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 glass-header">
        <button
          type="button"
          onClick={handleEndOrCancel}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="font-semibold">{callSession.partner.username}</span>
        </button>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-400">
          Voice Call
        </span>
      </div>

      {/* Main Call Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* User Avatar */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-pulse" />
          <UserAvatar
            username={callSession.partner.username}
            avatarUrl={callSession.partner.avatarUrl}
            size="lg"
            className="h-32 w-32 border-4 border-indigo-500/30 shadow-2xl"
          />
        </div>

        {/* Partner Name */}
        <h2 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
          {callSession.partner.username}
        </h2>

        {/* Connection Status / Duration */}
        <p className="text-sm font-semibold text-emerald-400 tracking-wide mb-12">
          {getStatusText()}
        </p>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-center gap-6">
          {/* Mute Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <span className="text-xs text-muted-foreground font-medium">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </div>

          {/* Speaker Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                isSpeakerOn
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Speaker"
            >
              {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
            <span className="text-xs text-muted-foreground font-medium">Speaker</span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleEndOrCancel}
              className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={22} />
            </button>
            <span className="text-xs text-muted-foreground font-medium">End</span>
          </div>
        </div>
      </div>

      {/* Remote Audio Playback Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
    </div>
  );
};

export default VoiceCallModal;
