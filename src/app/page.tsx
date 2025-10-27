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
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Page() {
  const { user, loading, signOut } = useAuth();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { threads, createThread, deleteThread, updateThread, refreshThreads } = useThreads();
  const { messages, send, streaming, model, setModel, clearMessages, loading: messagesLoading, usage, depthMode, setDepthMode, conversationSummary, continuationPrompt, forceContinue, cancelContinuation, stopGeneration } = useChat({
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
    console.log('handleSend called with:', { text, attachedFiles, currentThreadId });
    
    // Create thread if it doesn't exist
    let threadId = currentThreadId;
    let isNewThread = false;
    if (!threadId) {
      console.log('Creating new thread...');
      const thread = await createThread(model);
      if (thread) {
        threadId = thread.id;
        setCurrentThreadId(thread.id);
        isNewThread = true;
        console.log('Thread created:', thread.id);
        
        // Auto-generate title from first message (first 50 chars)
        const title = text.length > 50 ? text.substring(0, 50) + '...' : text;
        
        // Small delay to ensure real-time INSERT event is processed first
        await new Promise(resolve => setTimeout(resolve, 100));
        await updateThread(thread.id, { title });
      }
    }
    
    // Upload PDFs to backend if thread exists and files are attached
    if (threadId && attachedFiles && attachedFiles.length > 0) {
      console.log(`Checking ${attachedFiles.length} attached file(s)...`);
      const pdfFiles = attachedFiles.filter(f => f.file.name.toLowerCase().endsWith('.pdf'));
      
      if (pdfFiles.length > 0) {
        console.log(`🔄 Uploading ${pdfFiles.length} PDF(s) to thread ${threadId}...`);
        const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';
        console.log('API Base URL:', apiBase);
        
        await Promise.all(pdfFiles.map(async (pdfFile) => {
          const formData = new FormData();
          formData.append('file', pdfFile.file);
          
          const uploadUrl = `${apiBase}/api/documents/upload?thread_id=${threadId}`;
          console.log(`Uploading to: ${uploadUrl}`);
          
          try {
            const response = await fetch(uploadUrl, {
              method: 'POST',
              body: formData,
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`✅ PDF uploaded successfully: ${pdfFile.file.name}`, result);
            } else {
              const errorText = await response.text();
              console.error(`❌ PDF upload failed (${response.status}): ${pdfFile.file.name}`, errorText);
            }
          } catch (error) {
            console.error(`❌ Error uploading PDF ${pdfFile.file.name}:`, error);
          }
        }));
      } else {
        console.log('No PDF files found in attachments');
      }
    } else {
      console.log('Skip upload:', { hasThread: !!threadId, hasFiles: !!attachedFiles, fileCount: attachedFiles?.length });
    }
    
    // Send with the threadId (either existing or newly created)
    if (threadId) {
      console.log('Sending message to thread:', threadId);
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
            {/* Mobile-only compact dashboard button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-9 w-9"
              onClick={() => router.push('/analytics/tokens')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
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
              onStop={stopGeneration}
              isGenerating={streaming}
              recentMessages={messages}
            />
          </div>
        </div>
      ) : (
        /* Messages with separate scroller and sticky composer */
        <div className="flex-1 flex flex-col">
          <MessageList messages={messages} streaming={streaming} threadId={currentThreadId} />
          
          {/* Reasoning Info - Only show when no messages */}
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4 max-w-2xl">
                <h2 className="text-2xl font-semibold">🧠 AI Reasoning Ready!</h2>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Your chat now supports transparent AI reasoning displays.</p>
                  
                  <div className="bg-muted/50 rounded-lg p-4 text-left">
                    <p className="font-medium text-foreground mb-2">🤖 Models that show reasoning:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>DeepSeek R1</strong> - Shows detailed thinking process</li>
                      <li>• <strong>OpenAI o1/o1-mini</strong> - Step-by-step analysis</li>
                      <li>• <strong>Claude (future versions)</strong> - Limited reasoning</li>
                    </ul>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-left">
                    <p className="font-medium text-foreground mb-2">⚠️ Current models:</p>
                    <p className="text-xs">Your current Claude models don&apos;t provide reasoning data - they give direct responses only.</p>
                  </div>
                  
                  <p className="text-xs">Start a conversation to see the reasoning components in action when using compatible models!</p>
                </div>
              </div>
            </div>
          )}
          
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
                onStop={stopGeneration}
                isGenerating={streaming}
                recentMessages={messages}
              />
            </div>
          </div>
        </div>
      )}
      </SidebarInset>
    </>
  );
}
