import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { CallSession, CallType, CallUser } from '@/types/call';

interface CallContextType {
  callSession: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  initiateCall: (partner: CallUser, conversationId: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const CallContext = createContext<CallContextType>({} as CallContextType);

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 1. Cleanup media tracks & peer connection ──────────────────────────────
  const cleanupCall = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingIceCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallSession(null);
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  // ── 2. Create RTCPeerConnection ───────────────────────────────────────────
  const createPeerConnection = useCallback((targetUserId: string, callId: string) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream tracks
    const remoteMedia = new MediaStream();
    remoteStreamRef.current = remoteMedia;
    setRemoteStream(remoteMedia);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteMedia.addTrack(track);
      });
    };

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          callId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallSession((prev) => (prev ? { ...prev, status: 'CONNECTED' } : null));

        // Start duration timer
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            setCallSession((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
          }, 1000);
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupCall();
      }
    };

    return pc;
  }, [socket, cleanupCall]);

  // ── 3. Acquire User Media (Camera / Microphone) ─────────────────────────
  const getMedia = useCallback(async (type: CallType) => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('[getUserMedia error]', err);
      throw new Error(err.message || 'Permission denied for camera/microphone');
    }
  }, []);

  // ── 4. Initiate Call (User A) ─────────────────────────────────────────────
  const initiateCall = useCallback(async (partner: CallUser, conversationId: string, type: CallType) => {
    if (!socket || !user) return;
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    try {
      const stream = await getMedia(type);

      const session: CallSession = {
        callId,
        conversationId,
        type,
        status: 'CALLING',
        isCaller: true,
        partner,
        duration: 0,
      };

      setCallSession(session);
      socket.emit('call:initiate', {
        callId,
        receiverId: partner._id,
        conversationId,
        type,
      });
    } catch (err: any) {
      alert(`Could not start ${type} call: ${err.message}`);
      cleanupCall();
    }
  }, [socket, user, getMedia, cleanupCall]);

  // ── 5. Accept Incoming Call (User B) ─────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !socket) return;

    try {
      await getMedia(incomingCall.type);

      const activeSession: CallSession = {
        ...incomingCall,
        status: 'CONNECTING',
      };

      setCallSession(activeSession);
      setIncomingCall(null);

      socket.emit('call:accept', { callId: incomingCall.callId });
    } catch (err: any) {
      alert(`Could not access microphone/camera: ${err.message}`);
      socket.emit('call:reject', { callId: incomingCall.callId });
      cleanupCall();
    }
  }, [incomingCall, socket, getMedia, cleanupCall]);

  // ── 6. Reject Call (User B) ───────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!incomingCall || !socket) return;
    socket.emit('call:reject', { callId: incomingCall.callId });
    cleanupCall();
  }, [incomingCall, socket, cleanupCall]);

  // ── 7. Cancel Call (User A) ───────────────────────────────────────────────
  const cancelCall = useCallback(() => {
    if (!callSession || !socket) return;
    socket.emit('call:cancel', { callId: callSession.callId });
    cleanupCall();
  }, [callSession, socket, cleanupCall]);

  // ── 8. End Call (User A or B) ─────────────────────────────────────────────
  const endCall = useCallback(() => {
    if (!callSession || !socket) return;
    socket.emit('call:end', { callId: callSession.callId, duration: callSession.duration });
    cleanupCall();
  }, [callSession, socket, cleanupCall]);

  // ── 9. Toggle Mute & Camera ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, []);

  // ── 10. Socket WebRTC Signaling Listeners ──────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    // Incoming Call (User B)
    const handleIncomingCall = (data: { callId: string; conversationId: string; type: CallType; caller: CallUser }) => {
      setIncomingCall({
        callId: data.callId,
        conversationId: data.conversationId,
        type: data.type,
        status: 'RINGING',
        isCaller: false,
        partner: data.caller,
        duration: 0,
      });
    };

    // Call Accepted (User A) -> Create SDP Offer
    const handleCallAccepted = async (data: { callId: string }) => {
      setCallSession((prev) => (prev ? { ...prev, status: 'CONNECTING' } : null));

      if (callSession?.partner._id) {
        const pc = createPeerConnection(callSession.partner._id, data.callId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:offer', {
          callId: data.callId,
          targetUserId: callSession.partner._id,
          sdp: offer,
        });
      }
    };

    // Received SDP Offer (User B) -> Set Remote & Create SDP Answer
    const handleCallOffer = async (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      if (callSession?.partner._id) {
        const pc = createPeerConnection(callSession.partner._id, data.callId);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Process pending ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:answer', {
          callId: data.callId,
          targetUserId: callSession.partner._id,
          sdp: answer,
        });
      }
    };

    // Received SDP Answer (User A) -> Set Remote Description
    const handleCallAnswer = async (data: { callId: string; sdp: RTCSessionDescriptionInit }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Process pending ICE candidates
        while (pendingIceCandidatesRef.current.length > 0) {
          const candidate = pendingIceCandidatesRef.current.shift();
          if (candidate) await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    };

    // Received ICE Candidate
    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else {
        pendingIceCandidatesRef.current.push(data.candidate);
      }
    };

    // Call Rejected
    const handleCallRejected = () => {
      setCallSession((prev) => (prev ? { ...prev, status: 'REJECTED', error: 'Call declined' } : null));
      setTimeout(() => cleanupCall(), 2000);
    };

    // Call Cancelled
    const handleCallCancelled = () => {
      setIncomingCall(null);
      cleanupCall();
    };

    // Call Ended
    const handleCallEnded = () => {
      cleanupCall();
    };

    // Call Missed
    const handleCallMissed = () => {
      setIncomingCall(null);
      setCallSession((prev) => (prev ? { ...prev, status: 'MISSED', error: 'Missed call' } : null));
      setTimeout(() => cleanupCall(), 2000);
    };

    // Call Failed
    const handleCallFailed = (data: { reason: string }) => {
      alert(data.reason || 'Call failed');
      cleanupCall();
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:cancelled', handleCallCancelled);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:missed', handleCallMissed);
    socket.on('call:failed', handleCallFailed);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:cancelled', handleCallCancelled);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:missed', handleCallMissed);
      socket.off('call:failed', handleCallFailed);
    };
  }, [socket, user, callSession, createPeerConnection, cleanupCall]);

  return (
    <CallContext.Provider
      value={{
        callSession,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        initiateCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleCamera,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
