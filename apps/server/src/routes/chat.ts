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

// CLAUDE TOKEN ECONOMY SYSTEM PROMPT
// Compression Contract: Ultra-minimal, structured output rules
const SYSTEM_INSTRUCTION = `You are Claude running under a strict Token Economy.
Always:
• Use ≤150 words (or one code block ≤120 lines)
• Never repeat the user's text
• Prefer 3 bullets over paragraphs; QA = bullets + one-line conclusion
• If context is large, ask for scope or output a plan first, then wait
• If unsure, ask one clarifying question (≤15 words)
• For bugfix: Diagnosis (≤3 bullets) → Patch (one block) → Test (≤2 lines)
• For summaries: 5 bullets, ≤20 words each
• Stop generating when the answer is sufficient
• Do not echo instructions or prior content unless explicitly asked`;

// Task classification for intelligent routing and token caps
type TaskClass = 'qa' | 'bugfix' | 'codegen-small' | 'codegen-large' | 'summarize' | 'plan' | 'detailed';

function classifyTask(message: string): TaskClass {
  const len = message.length;
  
  // Explicit detail request - preserve quality
  if (/\b(detailed?|comprehensive|thorough|complete|explain\s+(in\s+)?detail|full\s+explanation|deep\s+dive|elaborate)\b/i.test(message)) {
    return 'detailed';
  }
  
  // QA: Short questions, simple queries
  if (len < 100 || /\b(what\s+is|who\s+is|when|where|define|yes\s+or\s+no|count|list)\b/i.test(message)) {
    return 'qa';
  }
  
  // Bugfix: Error messages, debugging
  if (/\b(error|bug|fix|broken|not\s+working|issue|debug|crash|exception)\b/i.test(message)) {
    return 'bugfix';
  }
  
  // Summarize: Condensing content
  if (/\b(summarize|summary|tldr|brief|overview|key\s+points)\b/i.test(message)) {
    return 'summarize';
  }
  
  // Plan: Architecture, design, strategy
  if (/\b(plan|strategy|approach|design|architecture|how\s+should\s+i)\b/i.test(message)) {
    return 'plan';
  }
  
  // Code generation: Large multi-file or >150 LOC
  if (/\b(implement|create|build|write|generate|scaffold)\b/i.test(message) && len > 800) {
    return 'codegen-large';
  }
  
  // Code generation: Small single-file
  if (/\b(code|function|class|component|implement|write\s+(a\s+)?function)\b/i.test(message)) {
    return 'codegen-small';
  }
  
  // Default to QA for efficiency
  return 'qa';
}

// Determine optimal model based on task class (ULTRA-AGGRESSIVE: 95% Haiku)
function selectOptimalModel(taskClass: TaskClass, messageLength: number): string {
  // Sonnet ONLY for: large codegen, detailed analysis, or complex reasoning
  if (taskClass === 'codegen-large' || 
      (taskClass === 'detailed' && messageLength > 1000)) {
    return 'claude-3-5-sonnet-latest';
  }
  
  // Everything else: Haiku (95%+ of requests)
  return 'claude-3-5-haiku-latest';
}

// Get optimal max_tokens based on task class (TIGHT CAPS)
function getMaxTokensByClass(taskClass: TaskClass): number {
  const caps: Record<TaskClass, number> = {
    'qa': 256,              // Short answers
    'bugfix': 512,          // Diagnosis + patch + test
    'codegen-small': 768,   // Single file/function
    'codegen-large': 2048,  // Multi-file (Sonnet only)
    'summarize': 256,       // 5 bullets
    'plan': 512,            // Planning doc
    'detailed': 4096        // User explicitly requested detail
  };
  
  return caps[taskClass];
}

// AGGRESSIVE INPUT COMPRESSION: Rolling summary + context selector
// Target: Keep conversation context ≤ 2,000 tokens by default
function optimizeContext(messages: any[], taskClass: TaskClass): any[] {
  if (messages.length <= 2) return messages;
  
  // Context budget based on task class
  const maxContextTokens = taskClass === 'detailed' ? 4000 : 2000;
  const maxRecentMessages = taskClass === 'detailed' ? 8 : 4;
  
  // Estimate tokens (1 token ≈ 4 characters)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  
  // Always keep the last user message (current request)
  const lastMessage = messages[messages.length - 1];
  let totalTokens = estimateTokens(lastMessage.content || '');
  
  // Start with just the current message
  const optimizedMessages = [lastMessage];
  
  // Work backwards and keep recent, essential messages (context selector)
  const recentMessages = [];
  
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
  
  // Rolling summary: If we dropped old messages, create ≤150-token summary
  const droppedCount = messages.length - recentMessages.length - 1;
  if (droppedCount > 0 && taskClass !== 'detailed') {
    const firstDroppedContent = messages[0].content?.substring(0, 50) || 'various topics';
    const summary = {
      role: 'assistant',
      content: `[Context: ${droppedCount} earlier exchanges about ${firstDroppedContent}. Key state preserved in recent turns.]`
    };
    return [summary, ...recentMessages, lastMessage];
  }
  
  return [...recentMessages, lastMessage];
}

// Check input:output ratio and trigger re-compression if needed
function checkTokenRatio(inputTokens: number, outputTokens: number): boolean {
  const ratio = inputTokens / (outputTokens || 1);
  if (ratio > 6) {
    console.log(`⚠️  Token ratio ${ratio.toFixed(1)}:1 exceeds 6:1 threshold - consider summary`);
    return true; // Should trigger summary
  }
  return false;
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post('/api/chat/stream', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = req.body as ChatRequest;

      if (!body.messages || !Array.isArray(body.messages)) {
        return reply.code(400).send({ error: 'Invalid messages format' });
      }

      // STEP 1: TASK CLASSIFICATION (Pre-Flight Pipeline)
      const lastMessage = body.messages[body.messages.length - 1]?.content || '';
      const taskClass = classifyTask(lastMessage);
      console.log(`📋 Task classified as: ${taskClass}`);

      // STEP 2: MODEL SELECTION (Ultra-aggressive: 95% Haiku)
      let finalModel: string;
      
      if (body.mode === 'auto' || !body.mode) {
        // Auto mode: Use task-based intelligent routing
        finalModel = selectOptimalModel(taskClass, lastMessage.length);
        console.log(`🤖 Auto mode: Selected ${finalModel} for ${taskClass} task`);
      } else {
        // Manual mode: Use the specified model
        finalModel = body.model || 'claude-3-5-haiku-latest';
        console.log(`⚙️  Manual mode: Using specified model ${finalModel}`);
      }
      
      // STEP 3: CONTEXT OPTIMIZATION (Input Compression)
      // Target: ≤2,000 tokens, with rolling summary for old turns
      const optimizedMessages = optimizeContext(body.messages, taskClass);
      
      // STEP 4: CACHE CHECK (Zero-token serving)
      const cachedResponse = promptCache.get(optimizedMessages, finalModel);
      if (cachedResponse) {
        console.log('✅ Cache hit - ZERO API tokens used');
        
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
            taskClass,
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
      
      // STEP 5: SET OUTPUT CAP (Tight max_tokens by task class)
      const maxTokens = getMaxTokensByClass(taskClass);
      
      const reductionPercent = body.messages.length > 1 
        ? Math.round((1 - optimizedMessages.length / body.messages.length) * 100) 
        : 0;
      
      console.log(`🚀 Token Economy: ${taskClass} → ${finalModel} | max_tokens: ${maxTokens} | context: ${body.messages.length} → ${optimizedMessages.length} msgs (${reductionPercent}% reduction)`);

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
          
          // Check token ratio (should be ≤6:1)
          checkTokenRatio(inputTokens, outputTokens);
          
          // Calculate efficiency metrics
          const tokenReduction = body.messages.length > 0 ? Math.round((1 - optimizedMessages.length / body.messages.length) * 100) : 0;
          const capUtilization = Math.round((outputTokens / maxTokens) * 100);
          
          console.log(`✅ Complete: ${finalModel} | ${taskClass} | In: ${inputTokens} | Out: ${outputTokens} | Cost: $${estimatedCost.toFixed(6)} | Cap: ${capUtilization}% | Reduction: ${tokenReduction}%`);
          
          // Flag low cap utilization (might be over-provisioned)
          if (capUtilization < 30) {
            console.log(`💡 Cap underutilized (${capUtilization}%) - consider lowering max_tokens for ${taskClass}`);
          }
          
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
                taskClass,
                optimization: {
                  originalModel: body.model,
                  selectedModel: finalModel,
                  originalMessages: body.messages.length,
                  optimizedMessages: optimizedMessages.length,
                  maxTokens,
                  capUtilization: `${capUtilization}%`,
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
