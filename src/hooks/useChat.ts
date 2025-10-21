import { useState, useEffect } from 'react';
import { streamChat } from '@/lib/sse';
import { Message } from '@/lib/types';
import { DEFAULT_MODEL } from '@/lib/constants';
import { useMessages } from './useMessages';

// Model pricing per million tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-opus-4-1-20250805': { input: 15, output: 75 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 3, output: 15 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
}

interface UseChatOptions {
  threadId: string | null;
  onMessageSaved?: () => void;
}

export function useChat({ threadId, onMessageSaved }: UseChatOptions = { threadId: null }) {
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [usage, setUsage] = useState({ tokens: 0, cost: 0 });
  const { messages, setMessages, saveMessages, loading } = useMessages(threadId);

  async function send(text: string, overrideThreadId?: string) {
    if (!text.trim() || streaming) return;

    const activeThreadId = overrideThreadId || threadId;
    const userMessage: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setStreaming(true);

    let reply: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, reply]);

    await streamChat({
      model,
      messages: newMessages,
      onToken: (token: string) => {
        reply.content += token;
        setMessages([...newMessages, { ...reply }]);
      },
      onDone: async (metadata?: { inputTokens?: number; outputTokens?: number }) => {
        setStreaming(false);
        
        // Calculate usage
        if (metadata) {
          const totalTokens = (metadata.inputTokens || 0) + (metadata.outputTokens || 0);
          const cost = calculateCost(model, metadata.inputTokens || 0, metadata.outputTokens || 0);
          setUsage({ tokens: totalTokens, cost });
        }
        
        // Save both user message and assistant reply to database
        if (activeThreadId) {
          await saveMessages([userMessage, reply], activeThreadId);
          onMessageSaved?.();
        }
      },
      onError: (error: string) => {
        console.error('Chat error:', error);
        reply.content = `Error: ${error}`;
        setMessages([...newMessages, { ...reply }]);
        setStreaming(false);
      },
    });
  }

  function clearMessages() {
    setMessages([]);
  }

  return { messages, send, streaming, model, setModel, clearMessages, loading, usage };
}
