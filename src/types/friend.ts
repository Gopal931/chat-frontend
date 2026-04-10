import { User } from './user';

export type RequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  _id: string;
  from: User;
  to: User;
  status: RequestStatus;
  createdAt: string;
}
