'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useThreads } from '@/hooks/useThreads';
import { EnhancedComposer } from '@/components/chat/EnhancedComposer';
import { MessageList } from '@/components/chat/MessageList';
import { ModelSwitcher } from '@/components/chat/ModelSwitcher';
import { UsageBadge } from '@/components/chat/UsageBadge';
import { useRouter } from 'next/navigation';
import { SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { cn } from '@/lib/utils';

export default function Page() {
  const { user, loading, signOut } = useAuth();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { threads, createThread, deleteThread, updateThread, refreshThreads } = useThreads();
  const { messages, send, streaming, model, setModel, clearMessages, loading: messagesLoading } = useChat({
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
        
        // Refresh sidebar to show new chat immediately
        refreshThreads();
      }
    }
    
    // Send with the threadId (either existing or newly created)
    if (threadId) {
      await send(text, threadId);
    }
  };

  const handleNewChat = () => {
    setCurrentThreadId(null);
    clearMessages();
    // Refresh sidebar to ensure all chats are visible
    refreshThreads();
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
    // Refresh sidebar when switching chats to show any new ones
    refreshThreads();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-700 bg-clip-text text-transparent animate-glow hover:scale-110 transition-transform cursor-pointer">
              JJK.AI
            </h1>
            <ModelSwitcher 
              currentModel={model} 
              onModelChange={setModel}
              disabled={streaming}
            />
          </div>
          <div className="flex items-center gap-4">
            <UsageBadge tokens={0} cost={0} />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {messages.length === 0 ? (
          /* Centered composer when empty */
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-4xl">
              <EnhancedComposer onSend={handleSend} disabled={streaming} />
            </div>
          </div>
        ) : (
          /* Messages with fixed composer at bottom */
          <>
            <div className="flex-1 overflow-hidden">
              <MessageList messages={messages} />
            </div>
            <div className="w-full flex justify-center border-t bg-background">
              <div className="w-full max-w-4xl">
                <EnhancedComposer onSend={handleSend} disabled={streaming} />
              </div>
            </div>
          </>
        )}
      </div>
      </SidebarInset>
    </>
  );
}
