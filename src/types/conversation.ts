import { User } from './user';
import { Message } from './message';

export interface Conversation {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  participants: User[];
  lastMessage?: Message;
  updatedAt: string;
  createdAt: string;
  unreadCount?: number;
}
