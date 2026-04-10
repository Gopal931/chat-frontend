# Pulse Chat — Frontend

A real-time chat application frontend built with React + TypeScript, featuring a sleek dark UI inspired by modern messaging apps.

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 + TypeScript | UI framework with type safety |
| Vite | Lightning-fast dev server & build tool |
| TailwindCSS | Utility-first styling |
| Axios | HTTP API requests with interceptors |
| Socket.IO Client | Real-time bidirectional messaging |
| React Router v6 | Client-side routing |
| Context API | Global state (Auth, Chat, Socket) |

## Folder Structure

```
src/
├── api/
│   └── axios.ts            # Axios instance with JWT interceptor
├── components/
│   ├── Sidebar.tsx          # Conversation list sidebar
│   ├── ConversationItem.tsx # Individual conversation row
│   ├── ChatWindow.tsx       # Message panel + socket integration
│   ├── MessageBubble.tsx    # Individual message bubble
│   └── MessageInput.tsx     # Textarea + send button
├── contexts/
│   ├── AuthContext.tsx      # JWT auth state + login/register/logout
│   ├── ChatContext.tsx      # Conversations, messages, online users
│   └── SocketContext.tsx    # Socket.IO connection lifecycle
├── hooks/
│   ├── useAuth.ts           # Access AuthContext
│   ├── useChat.ts           # Access ChatContext
│   └── useSocket.ts         # Access SocketContext
├── pages/
│   ├── Login.tsx            # Login form page
│   ├── Signup.tsx           # Registration form page
│   └── Chat.tsx             # Main chat layout (sidebar + window)
├── types/
│   ├── user.ts              # User, AuthUser, LoginPayload, etc.
│   ├── message.ts           # Message, SendMessagePayload
│   └── conversation.ts      # Conversation type
├── App.tsx                  # Router + providers + protected routes
├── main.tsx                 # React DOM entry point
└── index.css                # Tailwind base + custom styles
```

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running at `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## API Endpoints Expected

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/register` | Register with username, email, password |
| GET | `/api/conversations` | Fetch all user conversations |
| GET | `/api/messages/:id` | Fetch messages for a conversation |
| POST | `/api/messages` | Send a new message |

### Auth Response Shape

```ts
{ token: string; user: { _id, username, email } }
```

### Conversation Shape

```ts
{
  _id: string;
  isGroup: boolean;
  groupName?: string;
  participants: User[];
  lastMessage?: Message;
  updatedAt: string;
}
```

### Message Shape

```ts
{
  _id: string;
  conversationId: string;
  sender: User;
  content: string;
  createdAt: string;
}
```

## Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `joinConversation` | Client → Server | `conversationId: string` | Join a chat room |
| `receiveMessage` | Server → Client | `Message` object | Incoming real-time message |
| `onlineUsers` | Server → Client | `string[]` (user IDs) | List of online user IDs |

## Features

- **JWT Authentication** — Token stored in localStorage, auto-attached to all requests
- **Auto-logout** — 401 responses clear session and redirect to login
- **Real-time messaging** — Socket.IO with room-based events
- **Online presence** — Green dot indicator for online users
- **Auto-scroll** — Jumps to latest message on new arrival
- **Loading skeletons** — Smooth UX while fetching data
- **Password strength meter** — Visual feedback on signup
- **Responsive layout** — Mobile-first with slide-over sidebar
- **Message grouping** — Avatar shown only for first message in a group
- **Conversation search** — Filter sidebar by name

## Environment Configuration

To change the API base URL, edit `src/api/axios.ts`:

```ts
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // ← change this
});
```

And the Socket.IO URL in `src/contexts/SocketContext.tsx`:

```ts
const socket = io('http://localhost:5000'); // ← change this
```
