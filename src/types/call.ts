export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'IDLE'
  | 'CALLING'
  | 'RINGING'
  | 'ACCEPTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'MISSED'
  | 'ENDED'
  | 'FAILED';

export interface CallUser {
  _id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface CallSession {
  callId: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  isCaller: boolean;
  partner: CallUser;
  duration: number; // in seconds
  startedAt?: Date;
  error?: string | null;
}
