export type RelationshipState = 'NOT_FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS';

export interface User {
  _id: string;
  username: string;
  email: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string | null;
  avatarKey?: string | null;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
}

export interface UserWithRelationship extends User {
  relationship: RelationshipState;
  requestId?: string;
}

export interface AuthUser extends User {
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
