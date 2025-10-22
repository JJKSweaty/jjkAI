'use client';
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatBubble } from './ChatBubble';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  streaming?: boolean;
  threadId?: string | null;
}

export function MessageList({ messages, streaming, threadId }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessageCountRef = useRef(messages.length);
  const previousStreamingRef = useRef(streaming);

  // Always scroll to bottom - no user position tracking
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior, 
        block: 'end',
        inline: 'nearest'
      });
    }
    // Also scroll the container to max height to ensure we're at absolute bottom
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, behavior === 'instant' ? 0 : 100);
    }
  };

  // INSTANT scroll on new message (user sent message)
  useEffect(() => {
    const newMessageAdded = messages.length > previousMessageCountRef.current;
    
    if (newMessageAdded) {
      // User just sent a message - scroll instantly to bottom
      scrollToBottom('instant');
    }
    
    previousMessageCountRef.current = messages.length;
  }, [messages.length]);


  // ALWAYS scroll to bottom when messages change or load
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);


  if (messages.length === 0) {
    return null;
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth overscroll-contain">
      <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 pb-24 sm:pb-32 max-w-4xl mx-auto">
        {messages.map((message, index) => {
          const isStreaming = index === messages.length - 1 && message.role === 'assistant' && !message.content;
          
          return (
            <ChatBubble key={index} role={message.role as 'user' | 'assistant' | 'system' | 'tool'}>
              {isStreaming ? (
                <div className="flex items-center gap-2 text-zinc-400">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Thinking...</span>
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      
                      return !inline && match ? (
                        <CodeBlock
                          code={codeString}
                          language={match[1]}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </ChatBubble>
          );
        })}
        {/* Invisible spacer at the end to ensure full scroll - extra tall */}
        <div ref={messagesEndRef} className="h-32" />
      </div>
    </div>
  );
}
