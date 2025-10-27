import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { initializeContextSystem } from '@/lib/context';

// Initialize context management system
const { contextManager, responseCompressor } = initializeContextSystem({
  model: 'claude-3-7-sonnet-20250219',
  maxChunks: 20
});

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return true;
  }
  
  if (limit.count >= 20) {
    return false;
  }
  
  limit.count++;
  return true;
}

// Simple document retrieval (replace with your actual RAG retrieval logic)
async function retrieveRelevantDocuments(query: string) {
  // This is a placeholder - replace with your actual document retrieval logic
  // For example, you might use a vector database like Pinecone or Weaviate
  return [
    {
      content: `Document about ${query.substring(0, 20)}...`,
      metadata: { source: 'doc1', relevance: 0.85 }
    }
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, model = 'claude-3-7-sonnet-20250219', sessionId = 'default' } = body;
    
    // Basic validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    // Rate limiting
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // 1. Retrieve relevant documents using RAG
    const relevantDocs = await retrieveRelevantDocuments(prompt);
    
    // 2. Add documents to context
    contextManager.addDocumentChunks(relevantDocs);
    
    // 3. Add user message to context
    await contextManager.addResponseChunk(`User: ${prompt}`, { 
      type: 'user',
      timestamp: new Date().toISOString()
    });
    
    // 4. Get optimized context for the LLM
    const context = contextManager.getOptimizedContext();
    
    // 5. Call Claude with the context
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    const systemPrompt = `You are a helpful AI assistant. Use the following context to answer the user's question. If you don't know the answer, say so.\n\nContext:\n${context}`;
    
    const message = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const responseText = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .filter((text) => text.trim().length > 0)
      .join('\n\n');

    // 6. Add AI response to context
    await contextManager.addResponseChunk(`Assistant: ${responseText}`, {
      type: 'assistant',
      timestamp: new Date().toISOString(),
      model,
      tokens: message.usage?.output_tokens || 0
    });
    
    // 7. Return the response
    return NextResponse.json({
      text: responseText,
      model,
      usage: message.usage,
      context: {
        chunks: context.split('\n---\n').length,
        tokens: Math.ceil(context.length / 4) // Rough estimate
      }
    });
    
  } catch (error: any) {
    console.error('Error in RAG chat endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}

// Handle CORS
// @ts-ignore
export const OPTIONS = async (request: NextRequest) => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
