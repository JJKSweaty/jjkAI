import { ChatStreamOptions, StreamEvent } from './types';

export async function streamChat({ model, messages, mode, onToken, onDone, onError }: ChatStreamOptions) {
  try {
    console.log('Connecting to:', `${process.env.NEXT_PUBLIC_API_BASE}/api/chat/stream`);
    console.log('Sending:', { model, messages, mode });
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, mode }),
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
        } catch (parseError) {
          console.error('Failed to parse SSE event:', parseError);
        }
      }
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}
