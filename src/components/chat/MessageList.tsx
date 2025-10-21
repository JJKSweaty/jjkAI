'use client';
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
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
  const userNearBottomRef = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior });
  };

  // Track if user is near the bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
      userNearBottomRef.current = distance < 120; // px threshold
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // On new messages or streaming: autoscroll if user is near bottom
  // Debounce to avoid laggy scroll on every character
  useEffect(() => {
    if (!userNearBottomRef.current) return;
    
    const timeoutId = setTimeout(() => {
      scrollToBottom(streaming ? 'smooth' : 'auto');
    }, 100); // Debounce by 100ms
    
    return () => clearTimeout(timeoutId);
  }, [messages, streaming]);

  // Force scroll to bottom when streaming stops (message generation completes)
  const previousStreaming = useRef(streaming);
  useEffect(() => {
    // If we were streaming but now we're not, force scroll to bottom
    if (previousStreaming.current && !streaming) {
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 150); // Small delay to ensure content is fully rendered
    }
    previousStreaming.current = streaming;
  }, [streaming]);

  // On thread change: force scroll to bottom
  useEffect(() => {
    const id = requestAnimationFrame(() => scrollToBottom('smooth'));
    return () => cancelAnimationFrame(id);
  }, [threadId]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="p-4 space-y-3 pb-6 max-w-4xl mx-auto">
        {messages.map((message, index) => {
          const isStreaming = index === messages.length - 1 && message.role === 'assistant' && !message.content;
          
          return (
            <div 
              key={index}
              className={cn(
                "flex",
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              )}
            >
              <Card 
                className={cn(
                  "p-4 rounded-2xl max-w-[75%]",
                  message.role === 'assistant' 
                    ? 'bg-muted/60 border-muted' 
                    : 'bg-card border-border'
                )}
              >
                {isStreaming ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <ReactMarkdown
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
                  </div>
                )}
              </Card>
            </div>
          );
        })}
        {/* Invisible div at the end to scroll to */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
