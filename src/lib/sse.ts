import { ChatStreamOptions, StreamEvent } from './types';
import { DepthMode, ConversationSummary } from './tokenOptimization';

interface EnhancedChatStreamOptions extends ChatStreamOptions {
  depthMode?: DepthMode;
  conversationSummary?: ConversationSummary | null;
  userId?: string;
  userEmail?: string;
  threadId?: string;
  signal?: AbortSignal;
  onContinuationPrompt?: (data: { message: string; cost: number; continuationCount: number }) => void;
  onReasoning?: (content: string, isStreaming: boolean, duration?: number) => void;
}

export async function streamChat({ 
  model, 
  messages, 
  mode, 
  depthMode = 'Standard',
  conversationSummary,
  userId,
  userEmail,
  threadId,
  signal,
  onToken, 
  onDone, 
  onError,
  onContinuationPrompt,
  onReasoning
}: EnhancedChatStreamOptions) {
  try {
    console.log('Connecting to:', `${process.env.NEXT_PUBLIC_API_BASE}/api/chat/stream`);
    console.log('Sending:', { model, messages, mode });
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model, 
        messages, 
        mode, 
        depthMode,
        conversationSummary,
        userId,
        userEmail,
        threadId
      }),
      signal, // Add abort signal support
    });

    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Response error:', errorText);
      throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.startsWith('data:')) continue;
        
        try {
          const evt: StreamEvent = JSON.parse(part.slice(5));
          
          if (evt.type === 'delta' && evt.text) {
            onToken(evt.text);
          }
          if (evt.type === 'done') {
            onDone(evt.usage);
          }
          if (evt.type === 'error' && evt.message) {
            onError(evt.message);
          }
          if (evt.type === 'continuation_prompt' && onContinuationPrompt) {
            onContinuationPrompt({
              message: (evt as any).message,
              cost: (evt as any).cost,
              continuationCount: (evt as any).continuationCount
            });
          }
          if (evt.type === 'reasoning_start' && onReasoning) {
            onReasoning('', true); // Start reasoning
          }
          if (evt.type === 'reasoning_delta' && evt.reasoning?.content && onReasoning) {
            onReasoning(evt.reasoning.content, true); // Streaming reasoning content
          }
          if (evt.type === 'reasoning_end' && onReasoning) {
            onReasoning(evt.reasoning?.content || '', false, evt.reasoning?.duration); // End reasoning
          }
        } catch (parseError) {
          console.error('Failed to parse SSE event:', parseError);
        }
      }
    }
  } catch (error) {
    // Check if error is due to abort
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Stream aborted by user');
      onError('Generation stopped');
      return;
    }
    onError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}
