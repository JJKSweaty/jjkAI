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
  const previousMessageCountRef = useRef(messages.length);
  const previousStreamingRef = useRef(streaming);

  // Always scroll to bottom - no user position tracking
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior });
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

  // CONTINUOUS auto-scroll during streaming (AI response)
  useEffect(() => {
    if (!streaming) return;
    
    // Keep scrolling to bottom while streaming
    const intervalId = setInterval(() => {
      scrollToBottom('smooth');
    }, 50); // Update every 50ms for smooth tracking
    
    return () => clearInterval(intervalId);
  }, [streaming]);

  // Force scroll when streaming completes (message finished)
  useEffect(() => {
    if (previousStreamingRef.current && !streaming) {
      // Message generation just finished - scroll to bottom
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
    }
    previousStreamingRef.current = streaming;
  }, [streaming]);

  // ALWAYS scroll to bottom on thread change (clicking existing chat)
  useEffect(() => {
    if (threadId !== null) {
      // Give messages time to load, then scroll to bottom
      setTimeout(() => {
        scrollToBottom('instant');
      }, 100);
    }
  }, [threadId]);

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
                    ? 'bg-muted/60 border border-primary/40' 
                    : 'bg-card border-border'
                )}
              >
                {isStreaming ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
