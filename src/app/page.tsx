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
  
  // Sync mode state with composer's localStorage
  const [mode, setMode] = useState<'Auto' | 'Manual'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('composer-mode') as 'Auto' | 'Manual') || 'Auto';
    }
    return 'Auto';
  });
  
  // Save mode to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('composer-mode', mode);
    }
  }, [mode]);

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

  const handleSend = async (text: string, attachedFiles?: any[]) => {
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
    
    // Upload PDFs to backend if thread exists and files are attached
    if (threadId && attachedFiles && attachedFiles.length > 0) {
      const pdfFiles = attachedFiles.filter(f => f.file.name.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length > 0) {
        console.log(`Uploading ${pdfFiles.length} PDF(s) to thread ${threadId}...`);
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';
        
        await Promise.all(pdfFiles.map(async (pdfFile) => {
          const formData = new FormData();
          formData.append('file', pdfFile.file);
          
          try {
            const response = await fetch(`${apiBase}/api/documents/upload?thread_id=${threadId}`, {
              method: 'POST',
              body: formData,
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ PDF uploaded: ${pdfFile.file.name}`, result);
            } else {
              console.error(`❌ PDF upload failed: ${pdfFile.file.name}`);
            }
          } catch (error) {
            console.error(`Error uploading PDF ${pdfFile.file.name}:`, error);
          }
        }));
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
        <div className="flex h-14 items-center justify-between px-2 sm:px-4 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <SidebarTrigger className="shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent animate-glow hover:scale-110 transition-transform cursor-pointer whitespace-nowrap">
              JJK.AI
            </h1>
            <div className="hidden md:block">
              <ModelSwitcher 
                currentModel={model} 
                onModelChange={setModel}
                disabled={streaming}
                mode={mode}
                onModeChange={setMode}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="hidden sm:block">
              <UsageBadge tokens={usage.tokens} cost={usage.cost} />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      {messages.length === 0 ? (
        /* Centered composer when empty */
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <EnhancedComposer 
              onSend={handleSend} 
              disabled={streaming} 
              hasThread={false}
              currentModel={model}
              onModelChange={setModel}
              mode={mode}
              onModeChange={setMode}
              depthMode={depthMode}
              onDepthModeChange={setDepthMode}
              tokenBudget={usage.budget}
              threadId={currentThreadId}
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
                mode={mode}
                onModeChange={setMode}
                depthMode={depthMode}
                onDepthModeChange={setDepthMode}
                tokenBudget={usage.budget}
                threadId={currentThreadId}
              />
            </div>
          </div>
        </div>
      )}
      </SidebarInset>
    </>
  );
}
