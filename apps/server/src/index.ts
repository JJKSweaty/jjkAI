import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { registerChatRoutes } from './routes/chat.js';

dotenv.config();

const app = Fastify({ 
  logger: true,
});

// Enable CORS for your frontend
await app.register(cors, {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
});

// Register routes
registerChatRoutes(app);

const port = Number(process.env.PORT) || 8787;
const host = '0.0.0.0';

try {
  await app.listen({ port, host });
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${port}/api/chat/stream`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
