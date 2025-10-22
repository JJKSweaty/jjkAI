'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useThreads } from '@/hooks/useThreads';
import { EnhancedComposer } from '@/components/chat/EnhancedComposer';
import { MessageList } from '@/components/chat/MessageList';
import { ModelSwitcher } from '@/components/chat/ModelSwitcher';
import { UsageBadge } from '@/components/chat/UsageBadge';
import { ContinuationPrompt } from '@/components/chat/ContinuationPrompt';
import { useRouter } from 'next/navigation';
import { SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

export default function Page() {
  const { user, loading, signOut } = useAuth();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { threads, createThread, deleteThread, updateThread, refreshThreads } = useThreads();
  const { messages, send, streaming, model, setModel, clearMessages, loading: messagesLoading, usage, depthMode, setDepthMode, conversationSummary, continuationPrompt, forceContinue, cancelContinuation } = useChat({
    threadId: currentThreadId,
    onMessageSaved: () => refreshThreads(),
  });
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Check for thread ID in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const threadId = params.get('thread');
      if (threadId) {
        setCurrentThreadId(threadId);
      }
    }
  }, []);

  const handleSend = async (text: string) => {
    // Create thread if it doesn't exist
    let threadId = currentThreadId;
    if (!threadId) {
      const thread = await createThread(model);
      if (thread) {
        threadId = thread.id;
        setCurrentThreadId(thread.id);
        
        // Auto-generate title from first message (first 50 chars)
        const title = text.length > 50 ? text.substring(0, 50) + '...' : text;
        await updateThread(thread.id, { title });
      }
    }
    
    // Send with the threadId (either existing or newly created)
    if (threadId) {
      await send(text, threadId);
      // No need to refresh - real-time subscriptions handle updates
    }
  };

  const handleNewChat = () => {
    setCurrentThreadId(null);
    clearMessages();
    // No need to refresh - sidebar already has latest data from real-time updates
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
    // No need to refresh - real-time subscriptions keep sidebar up to date
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Clean background while loading, no loading indicators */}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <AppSidebar 
        onNewChat={handleNewChat}
        onThreadSelect={handleThreadSelect}
        currentThreadId={currentThreadId}
      />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent animate-glow hover:scale-110 transition-transform cursor-pointer">
              JJK.AI
            </h1>
            <ModelSwitcher 
              currentModel={model} 
              onModelChange={setModel}
              disabled={streaming}
            />
          </div>
          <div className="flex items-center gap-4">
            <UsageBadge tokens={usage.tokens} cost={usage.cost} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      {messages.length === 0 ? (
        /* Centered composer when empty */
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl px-4">
            <EnhancedComposer 
              onSend={handleSend} 
              disabled={streaming} 
              hasThread={false}
              currentModel={model}
              onModelChange={setModel}
              depthMode={depthMode}
              onDepthModeChange={setDepthMode}
              tokenBudget={usage.budget}
            />
          </div>
        </div>
      ) : (
        /* Messages with separate scroller and sticky composer */
        <div className="flex-1 flex flex-col">
          <MessageList messages={messages} streaming={streaming} threadId={currentThreadId} />
          
          {/* Continuation Prompt - Show only when cost is high */}
          {continuationPrompt?.show && (
            <div className="sticky bottom-[76px] z-30 px-4 pb-3">
              <ContinuationPrompt
                message={continuationPrompt.message}
                cost={continuationPrompt.cost}
                continuationCount={continuationPrompt.continuationCount}
                onContinue={forceContinue}
                onCancel={cancelContinuation}
                isLoading={streaming}
              />
            </div>
          )}
          
          {/* Composer - unified backdrop strip to prevent compositing seams */}
          <div className="sticky bottom-0 z-20 bg-background border-t border-border/50">
            <div className="mx-auto px-4 py-3">
              <EnhancedComposer 
                onSend={handleSend} 
                disabled={streaming} 
                hasThread={true}
                currentModel={model}
                onModelChange={setModel}
                depthMode={depthMode}
                onDepthModeChange={setDepthMode}
                tokenBudget={usage.budget}
              />
            </div>
          </div>
        </div>
      )}
      </SidebarInset>
    </>
  );
}
