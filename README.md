# Claude Duo Web App

A modern web application for chatting with Claude AI models, built with Next.js 14, TypeScript, TailwindCSS, shadcn/ui, and Supabase.

## 🚀 Features

- **Authentication**: Supabase magic link authentication
- **Real-time Streaming**: SSE-based streaming responses from Claude
- **Model Selection**: Switch between Claude 3.5 Haiku, Sonnet, and Opus
- **Modern UI**: Beautiful, responsive interface with shadcn/ui components
- **TypeScript**: Full type safety throughout the application
- **Dark Mode Ready**: Styled with CSS variables for easy theming

## 📋 Prerequisites

- Node.js 18+ and pnpm installed
- Supabase account and project
- Backend API running (for chat streaming)

## 🛠️ Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_SUPABASE_URL.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE=http://localhost:8787
NEXT_PUBLIC_DEFAULT_MODEL=claude-3-5-haiku-latest
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main chat page
│   ├── auth/page.tsx       # Authentication page
│   └── globals.css         # Global styles
├── components/
│   ├── chat/
│   │   ├── Composer.tsx    # Message input
│   │   ├── MessageList.tsx # Chat messages display
│   │   ├── ModelSwitcher.tsx # Model selection dropdown
│   │   └── UsageBadge.tsx  # Token/cost display
│   └── ui/                 # shadcn/ui components
├── hooks/
│   ├── useAuth.ts          # Authentication hook
│   └── useChat.ts          # Chat logic hook
├── lib/
│   ├── supabaseClient.ts   # Supabase client
│   ├── sse.ts              # SSE streaming helper
│   ├── types.ts            # TypeScript types
│   ├── constants.ts        # App constants
│   ├── format.ts           # Formatting utilities
│   └── utils.ts            # General utilities
└── state/
    └── atoms.ts            # Jotai state atoms
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui + Radix UI
- **Authentication**: Supabase Auth
- **State Management**: Jotai
- **Markdown**: react-markdown
- **Icons**: Lucide React

## 🔧 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 📝 Usage

1. **Sign In**: Enter your email to receive a magic link
2. **Select Model**: Choose between Haiku, Sonnet, or Opus
3. **Chat**: Type your message and press Enter or click Send
4. **Clear Chat**: Click the trash icon to start a new conversation
5. **Sign Out**: Click the logout icon to end your session

## 🔐 Authentication Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Email authentication in Authentication > Providers
3. Copy your project URL and anon key to `.env.local`
4. Configure email templates in Authentication > Email Templates

## 🌐 Backend API

This frontend expects a backend API at `NEXT_PUBLIC_API_BASE` with the following endpoint:

**POST** `/api/chat/stream`
- Request: `{ model: string, messages: Message[] }`
- Response: Server-Sent Events (SSE) stream
- Events: `{ type: 'delta' | 'done' | 'error', text?: string, message?: string }`

## 📦 Building for Production

```bash
pnpm build
pnpm start
```

## 🎯 Future Enhancements

- Thread management and history
- Code syntax highlighting with highlight.js
- File attachments
- Export conversations
- Usage analytics dashboard
- Multi-user conversations

## 📄 License

MIT
