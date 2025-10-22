import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { registerChatRoutes } from './routes/chat.js';
import { registerTokenRoutes } from './routes/tokens.js';
import { documentRoutes } from './routes/documents.js';
// import { ragChatRoutes } from './routes/ragChat.js';

dotenv.config();

const app = Fastify({ 
  logger: true,
});

// Enable CORS for your frontend
await app.register(cors, {
  origin: (origin, cb) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      /^https:\/\/.*\.vercel\.app$/,  // Allow all Vercel deployments
    ];
    
    if (!origin || allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['POST', 'GET', 'OPTIONS'],
  credentials: true,
});

// Enable multipart for file uploads
await app.register(fastifyMultipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 1, // One file at a time
  },
});

// Register routes
registerChatRoutes(app);
registerTokenRoutes(app);
await app.register(documentRoutes, { prefix: '/api/documents' });
// await app.register(ragChatRoutes, { prefix: '/api/chat' });

const port = Number(process.env.PORT || 8080);
const host = '0.0.0.0';

try {
  await app.listen({ port, host });
  console.log(`✅ Server running on ${host}:${port}`);
  console.log(`📡 Health check: /health`);
  console.log(`💬 Chat endpoint: /api/chat/stream`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
