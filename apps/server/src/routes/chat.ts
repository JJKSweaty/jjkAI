import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anthropic } from '../lib/anthropic.js';
import { ChatRequest } from '../utils/types.js';

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat/stream', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as ChatRequest;

      if (!body.messages || !Array.isArray(body.messages)) {
        return reply.code(400).send({ error: 'Invalid messages format' });
      }

      const model = body.model || 'claude-3-5-haiku-latest';

      // Set SSE headers with CORS
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      });

      let streamEnded = false;

      try {
        const stream = anthropic.messages.stream({
          model,
          max_tokens: 4096,
          temperature: 0.7,
          messages: body.messages,
        });

        // Handle text deltas
        stream.on('text', (text) => {
          if (!streamEnded && !reply.raw.writableEnded) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
          }
        });

        // Handle completion
        stream.on('message', (message) => {
          console.log('Message complete:', message.usage);
          if (!streamEnded && !reply.raw.writableEnded) {
            reply.raw.write(`data: ${JSON.stringify({ 
              type: 'done',
              usage: {
                inputTokens: message.usage.input_tokens,
                outputTokens: message.usage.output_tokens
              }
            })}\n\n`);
            streamEnded = true;
            reply.raw.end();
          }
        });

        // Handle errors
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!streamEnded && !reply.raw.writableEnded) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`);
            streamEnded = true;
            reply.raw.end();
          }
        });

        // Wait for the stream to complete
        await stream.finalMessage();

      } catch (streamError) {
        console.error('Anthropic API error:', streamError);
        if (!streamEnded && !reply.raw.writableEnded) {
          reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to connect to Claude API' })}\n\n`);
          streamEnded = true;
          reply.raw.end();
        }
      }
    } catch (err) {
      console.error('Request error:', err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Health check endpoint
  app.get('/health', async (req, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
