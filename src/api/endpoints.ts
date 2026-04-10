export const AUTH = {
  REGISTER: '/auth/register',
  LOGIN:    '/auth/login',
} as const;

export const USERS = {
  GET_ALL: '/users',
} as const;

export const CONVERSATIONS = {
  GET_ALL: '/conversations',
  CREATE:  '/conversations',
  DELETE:  (id: string) => `/conversations/${id}`,
} as const;

export const MESSAGES = {
  GET:          (id: string) => `/messages/${id}`,
  SEND:         '/messages',
  EDIT:         (id: string) => `/messages/${id}`,
  DELETE:       (id: string) => `/messages/${id}`,
  // New presigned URL flow
  UPLOAD_URL:   '/messages/upload-url',   // Step 1: presigned PUT URL maango
  SAVE_FILE:    '/messages/file',         // Step 2: metadata save karo
  DOWNLOAD_URL: (messageId: string) => `/messages/download-url/${messageId}`,
} as const;

export const FRIENDS = {
  SEARCH:       '/friends/search',
  SEND_REQUEST: '/friends/request',
  PENDING:      '/friends/requests/pending',
  SENT:         '/friends/requests/sent',
  ACCEPT:       (id: string) => `/friends/accept/${id}`,
  DECLINE:      (id: string) => `/friends/decline/${id}`,
  CONNECTED:    '/friends/connected',
} as const;