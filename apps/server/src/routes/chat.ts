import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anthropic } from '../lib/anthropic.js';
import { ChatRequest } from '../utils/types.js';
import { promptCache } from '../utils/promptCache.js';

// Claude model pricing and capabilities
const CLAUDE_MODELS = {
  'claude-3-5-haiku-latest': { 
    cost: 'low', 
    capability: 'basic',
    maxTokens: 8192,
    inputPrice: 0.8, // per million tokens
    outputPrice: 4
  },
  'claude-3-5-sonnet-latest': { 
    cost: 'medium', 
    capability: 'advanced',
    maxTokens: 8192,
    inputPrice: 3,
    outputPrice: 15
  },
  'claude-3-opus-latest': { 
    cost: 'high', 
    capability: 'premium',
    maxTokens: 4096,
    inputPrice: 15,
    outputPrice: 75
  }
};

// Minimal system prompt (< 50 tokens) for token efficiency
const SYSTEM_INSTRUCTION = "Be concise. Use ≤150 words per reply. Avoid repeating context. Summarize when appropriate.";

// Determine optimal model based on request complexity
function selectOptimalModel(messages: any[], requestedModel?: string): string {
  if (requestedModel && CLAUDE_MODELS[requestedModel as keyof typeof CLAUDE_MODELS]) {
    return requestedModel;
  }

  const lastMessage = messages[messages.length - 1]?.content || '';
  const messageLength = lastMessage.length;
  const hasCodeKeywords = /\b(code|function|class|algorithm|debug|error|implement|optimize)\b/i.test(lastMessage);
  const hasComplexKeywords = /\b(analyze|complex|detailed|comprehensive|explain|reasoning|strategy)\b/i.test(lastMessage);

  // AGGRESSIVE model routing: Default to Haiku (cheapest)
  // Only use Sonnet for truly complex tasks
  if (messageLength > 2000 || hasComplexKeywords) {
    return 'claude-3-5-sonnet-latest'; // Complex reasoning
  } else if (hasCodeKeywords && messageLength > 500) {
    return 'claude-3-5-sonnet-latest'; // Code generation
  } else {
    return 'claude-3-5-haiku-latest'; // Everything else (80% of requests)
  }
}

// Aggressive token optimization: Summarize and compress context
// BUT: Preserve quality when user explicitly requests detail
function optimizeContext(messages: any[], requestedDetail: boolean = false): any[] {
  if (messages.length <= 2) return messages;
  
  // If user wants detailed/comprehensive response, be less aggressive
  const maxContextTokens = requestedDetail ? 4000 : 2000;
  
  // Estimate tokens (1 token ≈ 4 characters)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  
  // Always keep the last user message (current request)
  const lastMessage = messages[messages.length - 1];
  let totalTokens = estimateTokens(lastMessage.content || '');
  
  // Start with just the current message
  const optimizedMessages = [lastMessage];
  
  // Work backwards and keep recent, essential messages
  const recentMessages = [];
  const maxRecentMessages = requestedDetail ? 8 : 4; // Keep more context for detailed requests
  
  for (let i = messages.length - 2; i >= 0 && recentMessages.length < maxRecentMessages; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content || '');
    
    if (totalTokens + msgTokens <= maxContextTokens) {
      recentMessages.unshift(msg);
      totalTokens += msgTokens;
    } else {
      break;
    }
  }
  
  // If we have older messages that were dropped, create a brief summary
  const droppedCount = messages.length - recentMessages.length - 1;
  if (droppedCount > 0 && !requestedDetail) {
    // Only summarize if NOT a detailed request
    const summary = {
      role: 'assistant',
      content: `[Context: ${droppedCount} earlier exchanges about ${messages[0].content?.substring(0, 50) || 'various topics'}...]`
    };
    return [summary, ...recentMessages, lastMessage];
  }
  
  return [...recentMessages, lastMessage];
}

// Determine optimal max_tokens - Quality-aware limits
function getOptimalMaxTokens(messages: any[], model: string): number {
  const lastMessage = messages[messages.length - 1]?.content || '';
  const modelConfig = CLAUDE_MODELS[model as keyof typeof CLAUDE_MODELS];
  
  // Check for EXPLICIT quality/detail requests - PRESERVE QUALITY
  if (/\b(detailed?|comprehensive|thorough|complete|explain\s+(in\s+)?detail|full\s+explanation|deep\s+dive|elaborate)\b/i.test(lastMessage)) {
    console.log('📝 Quality mode: User requested detailed response - using high token limit');
    return Math.min(4096, modelConfig.maxTokens); // High limit for quality
  }
  
  // Check for brevity requests - AGGRESSIVE SAVINGS
  if (/\b(brief|short|concise|quick|summary|tldr|in\s+short)\b/i.test(lastMessage)) {
    console.log('⚡ Speed mode: User requested brief response - using low token limit');
    return 512; // Very short responses
  }
  
  // Code generation - MODERATE LIMIT
  if (/\b(code|function|class|implement|write\s+(a\s+)?function|create\s+(a\s+)?class)\b/i.test(lastMessage)) {
    console.log('💻 Code mode: Detected code request - using moderate token limit');
    return Math.min(2048, modelConfig.maxTokens);
  }
  
  // Default: Balanced efficiency (768 tokens ≈ 600 words)
  console.log('⚖️  Balanced mode: Using standard token limit');
  return 768;
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat/stream', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as ChatRequest;

      if (!body.messages || !Array.isArray(body.messages)) {
        return reply.code(400).send({ error: 'Invalid messages format' });
      }

      // Optimize model selection based on mode and request complexity
      let finalModel: string = body.model || 'claude-3-5-haiku-latest';
      
      if (body.mode === 'auto' || !body.mode) {
        // Auto mode: Use intelligent model selection
        finalModel = selectOptimalModel(body.messages, body.model);
        console.log(`🤖 Auto mode: Selected ${finalModel} for request`);
      } else {
        // Manual mode: Use the specified model
        finalModel = body.model || 'claude-3-5-haiku-latest';
        console.log(`⚙️  Manual mode: Using specified model ${finalModel}`);
      }
      
      // AGGRESSIVE context optimization to reduce input tokens
      // BUT: Detect if user wants detailed response and preserve quality
      const lastMessage = body.messages[body.messages.length - 1]?.content || '';
      const wantsDetail = /\b(detailed?|comprehensive|thorough|complete|explain\s+(in\s+)?detail|full\s+explanation|deep\s+dive|elaborate)\b/i.test(lastMessage);
      
      const optimizedMessages = optimizeContext(body.messages, wantsDetail);
      
      // Check cache for frequently asked questions
      const cachedResponse = promptCache.get(optimizedMessages, finalModel);
      if (cachedResponse) {
        console.log('✅ Serving cached response - ZERO API tokens used');
        
        // Set SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': req.headers.origin || '*',
          'Access-Control-Allow-Credentials': 'true',
        });

        // Send cached response as stream
        reply.raw.write(`data: ${JSON.stringify({ type: 'delta', text: cachedResponse.response })}\n\n`);
        reply.raw.write(`data: ${JSON.stringify({ 
          type: 'done',
          usage: {
            ...cachedResponse.usage,
            cached: true,
            optimization: {
              originalModel: body.model,
              selectedModel: finalModel,
              originalMessages: body.messages.length,
              optimizedMessages: optimizedMessages.length,
              cacheHit: true,
              tokensSaved: '100%'
            }
          }
        })}\n\n`);
        reply.raw.end();
        return;
      }
      
      // Set aggressive max_tokens limits for output
      const maxTokens = getOptimalMaxTokens(optimizedMessages, finalModel);
      
      console.log(`🚀 Token Optimization: ${body.model} → ${finalModel}, max_tokens: ${maxTokens}, messages: ${body.messages.length} → ${optimizedMessages.length} (${Math.round((1 - optimizedMessages.length / body.messages.length) * 100)}% reduction)`);

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
          model: finalModel || 'claude-3-5-haiku-latest',
          max_tokens: maxTokens,
          temperature: 0.7,
          messages: optimizedMessages,
        });

        let fullResponse = '';

        // Handle text deltas
        stream.on('text', (text) => {
          fullResponse += text;
          if (!streamEnded && !reply.raw.writableEnded) {
            reply.raw.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
          }
        });

        // Handle completion
        stream.on('message', (message) => {
          const modelConfig = CLAUDE_MODELS[finalModel as keyof typeof CLAUDE_MODELS] || CLAUDE_MODELS['claude-3-5-haiku-latest'];
          const inputTokens = message.usage.input_tokens;
          const outputTokens = message.usage.output_tokens;
          const estimatedCost = (inputTokens * modelConfig.inputPrice + outputTokens * modelConfig.outputPrice) / 1000000;
          
          const tokenReduction = body.messages.length > 0 ? Math.round((1 - optimizedMessages.length / body.messages.length) * 100) : 0;
          console.log(`✅ Request complete: ${finalModel}, Input: ${inputTokens} tokens, Output: ${outputTokens} tokens, Cost: $${estimatedCost.toFixed(6)}, Context reduction: ${tokenReduction}%`);
          
          // Cache the response for future use
          promptCache.set(optimizedMessages, finalModel || 'claude-3-5-haiku-latest', fullResponse, {
            inputTokens,
            outputTokens,
            model: finalModel || 'claude-3-5-haiku-latest',
            estimatedCost
          });
          
          if (!streamEnded && !reply.raw.writableEnded) {
            reply.raw.write(`data: ${JSON.stringify({ 
              type: 'done',
              usage: {
                inputTokens,
                outputTokens,
                model: finalModel,
                estimatedCost,
                optimization: {
                  originalModel: body.model,
                  selectedModel: finalModel,
                  originalMessages: body.messages.length,
                  optimizedMessages: optimizedMessages.length,
                  maxTokens,
                  tokenReduction: `${tokenReduction}%`,
                  cached: false
                }
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

  // Cache stats endpoint for monitoring
  app.get('/api/cache/stats', async (req, reply) => {
    const stats = promptCache.getStats();
    return {
      cache: stats,
      models: CLAUDE_MODELS,
      timestamp: new Date().toISOString()
    };
  });
}
