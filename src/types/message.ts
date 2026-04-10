import { User } from './user';

export type MessageStatus = 'sent' | 'delivered' | 'seen';
export type MessageType   = 'text' | 'file' | 'image';

export interface Message {
  _id:           string;
  conversationId:string;
  sender:        User;
  text:          string;
  content:       string;
  edited?:       boolean;
  read?:         boolean;
  status:        MessageStatus;
  createdAt:     string;
  updatedAt?:    string;
  messageType:   MessageType;
  fileUrl?:      string;       // dynamically generated presigned GET URL — DB mein nahi hai
  fileKey?:      string;       // S3 object key — DB mein permanently stored
  fileName?:     string;
  fileSize?:     number;
  fileMimeType?: string;
}