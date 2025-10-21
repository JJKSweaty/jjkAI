import { useState, useEffect } from 'react';
import { streamChat } from '@/lib/sse';
import { Message } from '@/lib/types';
import { DEFAULT_MODEL } from '@/lib/constants';
import { useMessages } from './useMessages';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';

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
  const { user } = useAuth();

  // Load total usage when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadTotalUsage();
    } else {
      // Reset usage when user logs out
      setUsage({ tokens: 0, cost: 0 });
    }
  }, [user]);

  const loadTotalUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('usage')
        .select('input_tokens, output_tokens, cost')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error loading usage:', error);
        return;
      }

      const totalTokens = data.reduce((sum, usage) => sum + usage.input_tokens + usage.output_tokens, 0);
      const totalCost = data.reduce((sum, usage) => sum + usage.cost, 0);

      setUsage({ tokens: totalTokens, cost: totalCost });
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  const saveUsage = async (inputTokens: number, outputTokens: number, cost: number, activeThreadId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('usage')
        .insert({
          user_id: user.id,
          thread_id: activeThreadId || null,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost,
        });

      if (error) {
        console.error('Error saving usage:', error);
      }
    } catch (error) {
      console.error('Error saving usage:', error);
    }
  };

  async function send(text: string, overrideThreadId?: string) {
    if (!text.trim() || streaming) return;

    const activeThreadId = overrideThreadId || threadId;
    const userMessage: Message = { role: 'user', content: text };
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setStreaming(true);

    let reply: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, reply]);

    // Get composer mode from localStorage
    const mode = (typeof window !== 'undefined' && localStorage.getItem('composer-mode') === 'Manual') ? 'manual' : 'auto';

    await streamChat({
      model,
      messages: newMessages,
      mode,
      onToken: (token: string) => {
        reply.content += token;
        setMessages([...newMessages, { ...reply }]);
      },
      onDone: async (metadata?: { inputTokens?: number; outputTokens?: number }) => {
        setStreaming(false);
        
        // Calculate and save usage
        if (metadata && user) {
          const inputTokens = metadata.inputTokens || 0;
          const outputTokens = metadata.outputTokens || 0;
          const cost = calculateCost(model, inputTokens, outputTokens);
          
          // Save usage to database
          await saveUsage(inputTokens, outputTokens, cost, activeThreadId || undefined);
          
          // Update local state with new totals
          setUsage(prev => ({
            tokens: prev.tokens + inputTokens + outputTokens,
            cost: prev.cost + cost
          }));
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
    // Don't reset usage when clearing messages - keep cumulative total
  }

  return { messages, send, streaming, model, setModel, clearMessages, loading, usage };
}
