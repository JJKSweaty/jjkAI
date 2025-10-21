# Claude Duo Backend Server

Fastify backend with SSE streaming for Claude AI chat.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=8787
```

## Run

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Endpoints

- `POST /api/chat/stream` - Chat with Claude (SSE streaming)
- `GET /health` - Health check

## Test

```bash
curl -X POST http://localhost:8787/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)
- `PORT` - Server port (default: 8787)
- `SUPABASE_URL` - Supabase project URL (optional)
- `SUPABASE_SERVICE_KEY` - Supabase service role key (optional)
