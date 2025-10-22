'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ChevronDown,
  ChevronUp,
  Home,
  Plus,
  Settings,
  MessageSquare,
  Search,
  Archive,
  LogOut,
  Folder,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useThreads } from '@/hooks/useThreads';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

const primary = [
  { title: 'Home', icon: Home, href: '/' },
];

interface AppSidebarProps {
  onNewChat?: () => void;
  onThreadSelect?: (threadId: string) => void;
  currentThreadId?: string | null;
}

export function AppSidebar({ onNewChat, onThreadSelect, currentThreadId }: AppSidebarProps = {}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { threads, loading: threadsLoading, deleteThread, updateThread } = useThreads();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      window.location.href = '/';
    }
  };

  const handleThreadClick = (threadId: string) => {
    if (onThreadSelect) {
      onThreadSelect(threadId);
    } else {
      window.location.href = `/?thread=${threadId}`;
    }
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      await deleteThread(threadId);
      
      // If we deleted the current thread, navigate away
      if (threadId === currentThreadId) {
        // Check if there are other threads to switch to
        const remainingThreads = threads.filter(t => t.id !== threadId);
        
        if (remainingThreads.length > 0) {
          // Switch to the most recent remaining thread
          const nextThread = remainingThreads[0];
          if (onThreadSelect) {
            onThreadSelect(nextThread.id);
          } else {
            window.location.href = `/?thread=${nextThread.id}`;
          }
        } else {
          // No threads left, go to new chat
          if (onNewChat) {
            onNewChat();
          } else {
            window.location.href = '/';
          }
        }
      }
    }
  };

  const startEditing = (e: React.MouseEvent, threadId: string, currentTitle: string) => {
    e.stopPropagation();
    setEditingId(threadId);
    setEditTitle(currentTitle || 'New Chat');
  };

  const saveEdit = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await updateThread(threadId, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="icon"
      className="border-r"
    >
      {/* Header: JJK.AI branding */}
      <SidebarHeader>
        <div className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-center">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent group-data-[collapsible=icon]:text-base">
            <span className="group-data-[collapsible=icon]:hidden">JJK.AI</span>
            <span className="hidden group-data-[collapsible=icon]:inline">JJK</span>
          </h1>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Content: groups */}
      <SidebarContent>
        {/* Primary */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Shortcuts */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Shortcuts</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleNewChat} className="min-h-[44px]">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Chats */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threadsLoading ? null : threads.length === 0 ? (
                <div className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-muted-foreground">No chats yet</div>
              ) : (
                threads.slice(0, 10).map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <div className="group flex items-center gap-1 w-full min-h-[44px]">
                      {editingId === thread.id ? (
                        /* Editing mode */
                        <div className="flex items-center gap-1 sm:gap-2 flex-1 px-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-9 sm:h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(e as any, thread.id);
                              if (e.key === 'Escape') cancelEdit(e as any);
                            }}
                          />
                          <button
                            onClick={(e) => saveEdit(e, thread.id)}
                            className="p-2 sm:p-1 hover:bg-primary/10 rounded min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Save"
                          >
                            <Check className="h-4 w-4 sm:h-3 sm:w-3 text-primary" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 sm:p-1 hover:bg-destructive/10 rounded min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                            title="Cancel"
                          >
                            <X className="h-4 w-4 sm:h-3 sm:w-3 text-destructive" />
                          </button>
                        </div>
                      ) : (
                        /* Normal mode */
                        <>
                          <SidebarMenuButton 
                            onClick={() => handleThreadClick(thread.id)}
                            isActive={currentThreadId === thread.id}
                            className="flex-1 min-h-[44px]"
                          >
                            <MessageSquare className="h-4 w-4 sm:h-4 sm:w-4" />
                            <span className="truncate text-sm">{thread.title || 'New Chat'}</span>
                          </SidebarMenuButton>
                          <button
                            onClick={(e) => startEditing(e, thread.id, thread.title || 'New Chat')}
                            className="opacity-0 group-hover:opacity-100 sm:opacity-0 p-2 sm:p-1 hover:bg-primary/10 rounded transition-opacity min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
                            title="Edit name"
                          >
                            <Pencil className="h-4 w-4 sm:h-3 sm:w-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteThread(e, thread.id)}
                            className="opacity-0 group-hover:opacity-100 sm:opacity-0 p-2 sm:p-1 hover:bg-destructive/10 rounded transition-opacity min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center touch-manipulation"
                            title="Delete chat"
                          >
                            <LogOut className="h-4 w-4 sm:h-3 sm:w-3 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: account menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="min-h-[44px]">
                  <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                    <AvatarFallback className="bg-red-600 text-white text-xs">
                      {user?.email?.substring(0, 2).toUpperCase() || 'JK'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{user?.email || 'User'}</span>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem asChild className="min-h-[44px] text-sm">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()} className="min-h-[44px] text-sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Thin rail that toggles on hover/click in icon mode */}
      <SidebarRail />
    </Sidebar>
  );
}
