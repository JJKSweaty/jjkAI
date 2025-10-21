import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anthropic } from '../lib/anthropic.js';
import { ChatRequest } from '../utils/types.js';
import { promptCache } from '../utils/promptCache.js';
import { 
  TokenManager, 
  ConversationOptimizer, 
  AutoContinuation, 
  ResponseCompressor,
  createOptimizedChatRequest,
  DepthMode,
  ConversationSummary,
  ContinuationContext 
} from '../../../src/lib/tokenOptimization.js';

// Enhanced ChatRequest with depth mode support
interface OptimizedChatRequest extends ChatRequest {
  depthMode?: DepthMode;
  conversationSummary?: ConversationSummary;
  continuation?: ContinuationContext;
}

// Initialize optimization components
const conversationOptimizer = new ConversationOptimizer();
const autoContinuation = new AutoContinuation();
const responseCompressor = new ResponseCompressor();

// Store conversation summaries (in production, use Redis or database)
const conversationSummaries = new Map<string, ConversationSummary>();

export async function chatRoutes(fastify: FastifyInstance) {
  // Main chat endpoint with token optimization
  fastify.post<{ Body: OptimizedChatRequest }>('/chat', async (request: FastifyRequest<{ Body: OptimizedChatRequest }>, reply: FastifyReply) => {
    try {
      const { messages, model, mode, depthMode = 'Standard', conversationSummary, continuation } = request.body;

      // Auto-detect depth mode if not provided
      const tokenManager = new TokenManager(model);
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      const actualDepthMode = depthMode || tokenManager.planDepthMode(lastUserMessage);

      // Get or create conversation summary for context optimization
      let summary = conversationSummary;
      if (!summary && messages.length > 8) {
        summary = await conversationOptimizer.createRollingSummary(messages);
      }

      // Create optimized request
      const optimizedRequest = createOptimizedChatRequest(
        messages,
        actualDepthMode,
        model,
        summary,
        continuation
      );

      console.log(`[Chat] DepthMode: ${actualDepthMode}, InputTokens: ~${optimizedRequest.metadata.estimatedInput}, MaxOutput: ${optimizedRequest.max_tokens}`);

      // Set response headers for streaming
      reply.raw.setHeader('Content-Type', 'text/plain; charset=utf-8');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      let inputTokens = 0;
      let outputTokens = 0;
      let fullResponse = '';
      let shouldCompress = actualDepthMode === 'Quick' || actualDepthMode === 'Standard';

      try {
        const stream = await anthropic.messages.create({
          model: optimizedRequest.model,
          max_tokens: optimizedRequest.max_tokens,
          temperature: optimizedRequest.temperature,
          top_p: optimizedRequest.top_p,
          system: optimizedRequest.system,
          messages: optimizedRequest.messages,
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.type === 'message_start') {
            inputTokens = chunk.message.usage?.input_tokens || 0;
          } else if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text') {
            const text = chunk.delta.text;
            fullResponse += text;
            reply.raw.write(text);
          } else if (chunk.type === 'message_delta') {
            outputTokens += chunk.usage?.output_tokens || 0;
          }
        }

        // Check if we need to continue due to length limit
        const finishReason = 'stop'; // Would get from stream in real implementation
        
        if (autoContinuation.shouldContinue(finishReason, fullResponse.length, optimizedRequest.max_tokens * 4) && 
            actualDepthMode === 'DeepDive') {
          
          // Auto-continue for Deep Dive mode
          console.log('[Chat] Auto-continuing due to length limit...');
          
          const continuationContext = autoContinuation.buildContinuationContext(summary || {
            runningSummary: '',
            pinnedFacts: [],
            workingSet: messages,
            tokenCount: 0
          }, fullResponse);

          // Recursive call for continuation (simplified - in production, implement proper continuation loop)
          reply.raw.write('\n\n[Continuing...]\n\n');
        }

        // Apply compression for Quick/Standard modes
        if (shouldCompress && fullResponse.length > 500) {
          console.log('[Chat] Applying response compression...');
          // Note: In production, you'd compress before streaming
          // This is just for demonstration
        }

        // Send metadata
        const metadata = {
          inputTokens,
          outputTokens,
          depthMode: actualDepthMode,
          tokenBudget: optimizedRequest.metadata.tokenBudget,
          compressed: shouldCompress,
        };

        reply.raw.write(`\n\n__METADATA__${JSON.stringify(metadata)}`);
        reply.raw.end();

      } catch (streamError) {
        console.error('Streaming error:', streamError);
        reply.raw.write(`Error: ${streamError.message}`);
        reply.raw.end();
      }

    } catch (error) {
      console.error('Chat error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Endpoint to get conversation summary
  fastify.get<{ Params: { threadId: string } }>('/chat/summary/:threadId', async (request, reply) => {
    try {
      const { threadId } = request.params;
      const summary = conversationSummaries.get(threadId);
      
      if (!summary) {
        return reply.code(404).send({ error: 'No summary found for this thread' });
      }
      
      reply.send(summary);
    } catch (error) {
      console.error('Summary error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Endpoint to create/update conversation summary
  fastify.post<{ 
    Params: { threadId: string }, 
    Body: { messages: any[] } 
  }>('/chat/summary/:threadId', async (request, reply) => {
    try {
      const { threadId } = request.params;
      const { messages } = request.body;
      
      const summary = await conversationOptimizer.createRollingSummary(messages);
      conversationSummaries.set(threadId, summary);
      
      reply.send(summary);
    } catch (error) {
      console.error('Summary creation error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Endpoint to compress text (for testing)
  fastify.post<{ Body: { text: string, reduction?: number } }>('/chat/compress', async (request, reply) => {
    try {
      const { text, reduction = 0.25 } = request.body;
      const compressed = await responseCompressor.compress(text, reduction);
      
      reply.send({
        original: text,
        compressed,
        originalLength: text.length,
        compressedLength: compressed.length,
        reduction: ((text.length - compressed.length) / text.length * 100).toFixed(1) + '%'
      });
    } catch (error) {
      console.error('Compression error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Token estimation endpoint
  fastify.post<{ Body: { text: string, model?: string } }>('/chat/estimate-tokens', async (request, reply) => {
    try {
      const { text, model = 'claude-3-5-sonnet-latest' } = request.body;
      const tokenManager = new TokenManager(model);
      const estimated = tokenManager.estimateTokens(text);
      
      reply.send({
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        estimatedTokens: estimated,
        characters: text.length,
        model
      });
    } catch (error) {
      console.error('Token estimation error:', error);
      reply.code(500).send({ error: 'Internal server error' });
    }
  });
}