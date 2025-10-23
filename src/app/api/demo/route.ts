/**
 * Demo Chat Proxy - Secure API endpoint for public demos
 * Prevents API key exposure while allowing demo functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Rate limiting storage (in production, use Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Demo responses for common prompts
const DEMO_RESPONSES: Record<string, string> = {
  'hello': "Hello! I'm Claude, an AI assistant. I'm running in demo mode, so responses are pre-generated. In the full version, I can help with coding, analysis, writing, and much more!",
  'what can you do': "In full mode, I can:\n• Write and debug code in any language\n• Analyze data and create visualizations\n• Help with research and writing\n• Answer questions on a wide range of topics\n• Assist with creative projects\n\nThis demo shows limited functionality with canned responses.",
  'code': "Here's a simple Python example:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint([fibonacci(i) for i in range(10)])\n```\n\nIn full mode, I can write complex applications, debug issues, and explain code in detail!",
  'explain': "I'd be happy to explain concepts! In demo mode, I can show you that I understand your request, but for detailed explanations of specific topics, the full version provides comprehensive, tailored responses.",
  'help': "I can help with many tasks! This is a demo with limited responses. The full version offers:\n\n✅ Real-time problem solving\n✅ Custom code generation\n✅ In-depth analysis\n✅ Document processing\n✅ Creative writing\n\nTry asking about coding, analysis, or any topic you'd like help with!"
};

// Simple rate limiting
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    // Reset window (5 minutes)
    rateLimitMap.set(ip, { count: 1, resetTime: now + 5 * 60 * 1000 });
    return true;
  }
  
  if (limit.count >= 20) { // 20 requests per 5 minutes
    return false;
  }
  
  limit.count++;
  return true;
}

// Get demo response based on prompt
function getDemoResponse(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // Check for exact matches first
  for (const [key, response] of Object.entries(DEMO_RESPONSES)) {
    if (lowerPrompt.includes(key)) {
      return response;
    }
  }
  
  // Default demo response
  return `Thanks for trying the demo! I can see you asked: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\nIn demo mode, I provide pre-generated responses. The full version would give you a detailed, personalized answer. Would you like to see what I can do with code, analysis, or creative writing?`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, demo = true, model = 'claude-haiku-4-5-20251001' } = body;
    
    // Basic validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: 'Prompt too long (max 2000 chars)' },
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
    
    // Demo mode: return canned responses
    if (demo || !process.env.ANTHROPIC_API_KEY) {
      const demoResponse = getDemoResponse(prompt);
      
      return NextResponse.json({
        text: demoResponse,
        model: `${model} (demo)`,
        usage: {
          inputTokens: Math.ceil(prompt.length / 4),
          outputTokens: Math.ceil(demoResponse.length / 4),
        },
        demo: true,
        message: process.env.ANTHROPIC_API_KEY 
          ? "Demo mode active" 
          : "No API key configured - demo only"
      });
    }
    
    // Real mode: forward to Anthropic API
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000, // Conservative limit for demos
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    
    const text = response.content[0]?.type === 'text' 
      ? response.content[0].text 
      : 'No text response generated';
    
    return NextResponse.json({
      text,
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      demo: false,
    });
    
  } catch (error: any) {
    console.error('Demo API error:', error);
    
    // Don't expose internal errors in demo
    return NextResponse.json(
      { 
        error: 'Service temporarily unavailable',
        demo: true,
        text: getDemoResponse('error fallback')
      },
      { status: 500 }
    );
  }
}

// Handle CORS for demo endpoint
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}