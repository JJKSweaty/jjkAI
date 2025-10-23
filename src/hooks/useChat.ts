import { useState, useEffect, useRef } from 'react';
import { streamChat } from '@/lib/sse';
import { Message } from '@/lib/types';
import { DEFAULT_MODEL } from '@/lib/constants';
import { useMessages } from './useMessages';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './useAuth';
import { 
  DepthMode, 
  TokenManager, 
  ConversationOptimizer,
  ConversationSummary 
} from '@/lib/tokenOptimization';

// Model pricing per million tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-opus-4-1-20250805': { input: 15, output: 75 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
  'claude-3-7-sonnet-20250219': { input: 3, output: 15 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 3, output: 15 };
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
}

interface UseChatOptions {
  threadId: string | null;
  onMessageSaved?: () => void;
}

interface ChatUsage {
  tokens: number;
  cost: number;
  inputTokens?: number;
  outputTokens?: number;
  depthMode?: DepthMode;
  budget?: {
    maxInput: number;
    maxOutput: number;
    used: number;
  };
}

export function useChat({ threadId, onMessageSaved }: UseChatOptions = { threadId: null }) {
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [depthMode, setDepthMode] = useState<DepthMode>('Standard');
  const [usage, setUsage] = useState<ChatUsage>({ tokens: 0, cost: 0 });
  const [conversationSummary, setConversationSummary] = useState<ConversationSummary | null>(null);
  const [currentReasoning, setCurrentReasoning] = useState<{ content: string; isStreaming: boolean; duration?: number } | null>(null);
  const [continuationPrompt, setContinuationPrompt] = useState<{
    show: boolean;
    message: string;
    cost: number;
    continuationCount: number;
    currentResponse: string;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { messages, setMessages, saveMessages, loading } = useMessages(threadId);
  const { user } = useAuth();

  // Initialize optimizers
  const tokenManager = new TokenManager(model);
  // Keep a stable conversation optimizer instance so effects don't re-run unnecessarily
  const conversationOptimizerRef = useRef<ConversationOptimizer | null>(null);
  if (!conversationOptimizerRef.current) {
    conversationOptimizerRef.current = new ConversationOptimizer();
  }

  // Update conversation summary when messages change
  useEffect(() => {
    if (messages.length > 8) {
      conversationOptimizerRef.current!.createRollingSummary(messages).then((summary) => {
        setConversationSummary(summary);
      });
    }
  }, [messages]);

  // Auto-detect depth mode based on user message
  const detectDepthMode = (message: string): DepthMode => {
    return tokenManager.planDepthMode(message, depthMode);
  };

  // Load total usage when component mounts or user changes
  // useCallback provides a stable reference for the effect dependency
  const loadTotalUsage = useRef<() => Promise<void>>();

  // Define function with stable reference using useRef to avoid re-creating the function
  // but avoid assigning directly to a read-only current by using a local callback wrapper
  const _loadTotalUsage = async () => {
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

      const totalTokens = (data || []).reduce((sum: number, usage: any) => sum + (usage.input_tokens || 0) + (usage.output_tokens || 0), 0);
      const totalCost = (data || []).reduce((sum: number, usage: any) => sum + (usage.cost || 0), 0);

      setUsage({ tokens: totalTokens, cost: totalCost });
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  // Keep a stable ref to the function so effects can call it without adding it to deps
  loadTotalUsage.current = _loadTotalUsage;

  useEffect(() => {
    if (user) {
      // Call the stable function if present
      loadTotalUsage.current?.();
    } else {
      // Reset usage when user logs out
      setUsage({ tokens: 0, cost: 0 });
    }
  }, [user]);

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

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    // Auto-detect or use selected depth mode
    const selectedDepthMode = detectDepthMode(text);
    const budget = tokenManager.getTokenBudget(selectedDepthMode);
    
    // Estimate input tokens for budget display
    const estimatedInput = tokenManager.estimateTokens(JSON.stringify(newMessages));
    const maxOutput = tokenManager.calculateMaxOutput(estimatedInput, budget.maxOutput, budget.safetyMargin);

    // Update usage with budget info
    setUsage(prev => ({
      ...prev,
      depthMode: selectedDepthMode,
      budget: {
        maxInput: budget.maxInput,
        maxOutput: maxOutput,
        used: 0
      }
    }));

    let reply: Message = { role: 'assistant', content: '' };
    setMessages([...newMessages, reply]);

    // Get composer mode from localStorage
    const mode = (typeof window !== 'undefined' && localStorage.getItem('composer-mode') === 'Manual') ? 'manual' : 'auto';

    await streamChat({
      model,
      messages: newMessages,
      mode,
      depthMode: selectedDepthMode,
      conversationSummary,
      userId: user?.id,
      userEmail: user?.email,
      threadId: activeThreadId || undefined,
      signal: abortControllerRef.current.signal,
      onToken: (token: string) => {
        reply.content += token;
        setMessages([...newMessages, { ...reply }]);
        
        // Update token usage in real-time
        const currentOutput = tokenManager.estimateTokens(reply.content);
        setUsage(prev => ({
          ...prev,
          budget: prev.budget ? { ...prev.budget, used: currentOutput } : undefined
        }));
      },
      onReasoning: (content: string, isStreaming: boolean, duration?: number) => {
        setCurrentReasoning({ content, isStreaming, duration });
        
        // Update the current message with reasoning data
        const updatedReply = { 
          ...reply, 
          reasoning: { content, isStreaming, duration } 
        };
        setMessages([...newMessages, updatedReply]);
      },
      onContinuationPrompt: (data) => {
        // Only show for EXTREME costs (>$0.50) - effectively never for coding
        // 100 continuations = ~$0.50, so this rarely triggers
        if (data.cost > 0.50) {
          setContinuationPrompt({
            show: true,
            message: data.message,
            cost: data.cost,
            continuationCount: data.continuationCount,
            currentResponse: reply.content
          });
          setStreaming(false); // Pause streaming
        }
      },
      onDone: async (metadata?: { 
        inputTokens?: number; 
        outputTokens?: number;
        depthMode?: DepthMode;
        compressed?: boolean;
      }) => {
        setStreaming(false);
        setCurrentReasoning(null); // Clear reasoning state
        
        // Calculate and save usage
        if (metadata && user) {
          const inputTokens = metadata.inputTokens || estimatedInput;
          const outputTokens = metadata.outputTokens || tokenManager.estimateTokens(reply.content);
          const cost = calculateCost(model, inputTokens, outputTokens);
          
          // Save usage to database
          await saveUsage(inputTokens, outputTokens, cost, activeThreadId || undefined);
          
          // Update local state with new totals
          setUsage(prev => ({
            tokens: prev.tokens + inputTokens + outputTokens,
            cost: prev.cost + cost,
            inputTokens,
            outputTokens,
            depthMode: metadata.depthMode || selectedDepthMode,
            budget: prev.budget
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

  async function forceContinue() {
    if (!continuationPrompt) return;

    const activeThreadId = threadId;
    setContinuationPrompt(null);
    setStreaming(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/chat/continue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId || 'default',
          previousResponse: continuationPrompt.currentResponse,
          model,
          maxTokens: 2048
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Find the current assistant message
      let reply = messages[messages.length - 1];
      if (reply.role !== 'assistant') {
        reply = { role: 'assistant', content: continuationPrompt.currentResponse };
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.startsWith('data:')) continue;
          
          try {
            const evt = JSON.parse(part.slice(5));
            
            if (evt.type === 'delta' && evt.text) {
              reply.content += evt.text;
              const updatedMessages = [...messages.slice(0, -1), reply];
              setMessages(updatedMessages);
            }
            if (evt.type === 'done') {
              setStreaming(false);
              // Save the completed message
              if (activeThreadId) {
                await saveMessages([reply], activeThreadId);
                onMessageSaved?.();
              }
            }
            if (evt.type === 'error') {
              setStreaming(false);
              console.error('Continuation error:', evt.message);
            }
          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Force continue error:', error);
      setStreaming(false);
    }
  }

  function cancelContinuation() {
    setContinuationPrompt(null);
  }

  function stopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreaming(false);
    }
  }

  return { 
    messages, 
    send, 
    streaming, 
    model, 
    setModel, 
    clearMessages, 
    loading, 
    usage,
    depthMode,
    setDepthMode,
    conversationSummary,
    continuationPrompt,
    forceContinue,
    cancelContinuation,
    stopGeneration
  };
}
