import { useState, useEffect } from 'react';
import { streamChat } from '@/lib/sse';
import { Message } from '@/lib/types';
import { DEFAULT_MODEL } from '@/lib/constants';
import { useMessages } from './useMessages';

interface UseChatOptions {
  threadId: string | null;
  onMessageSaved?: () => void;
}

export function useChat({ threadId, onMessageSaved }: UseChatOptions = { threadId: null }) {
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
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
      onDone: async () => {
        setStreaming(false);
        
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

  return { messages, send, streaming, model, setModel, clearMessages, loading };
}
