'use client';

import { cn } from '@/lib/utils';
import { ChatTypography } from './ChatTypography';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '@/components/ai/reasoning';

export function ChatBubble({
  role,
  children,
  meta,
  reasoning,
}: {
  role: 'assistant' | 'user' | 'system' | 'tool';
  children: React.ReactNode;
  meta?: React.ReactNode;
  reasoning?: {
    content: string;
    isStreaming?: boolean;
    duration?: number;
  };
}) {
  const base = 'w-full rounded-xl sm:rounded-2xl px-3 sm:px-4 md:px-5 py-3 sm:py-4 shadow-none animate-fadeIn';
  const styles = {
    assistant: 'bg-zinc-950/60 border border-zinc-800',
    user: 'bg-zinc-900 border border-zinc-800',
    system: 'bg-amber-950/30 border border-amber-900/40',
    tool: 'bg-sky-950/30 border border-sky-900/40 font-mono text-[0.92rem]',
  }[role];

  return (
    <div className="flex gap-2 sm:gap-3">
      <div className={cn(base, styles, 'flex-1 max-w-3xl overflow-hidden')}>
        {meta && <div className="mb-2 text-xs text-zinc-400">{meta}</div>}
        
        {/* Show reasoning for assistant messages only */}
        {reasoning && role === 'assistant' && (
          <div className="mb-3">
            <Reasoning 
              isStreaming={reasoning.isStreaming} 
              duration={reasoning.duration}
              defaultOpen={false}
            >
              <ReasoningTrigger title="AI Reasoning" />
              <ReasoningContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {reasoning.content}
                </div>
              </ReasoningContent>
            </Reasoning>
          </div>
        )}
        
        <ChatTypography>{children}</ChatTypography>
      </div>
    </div>
  );
}
