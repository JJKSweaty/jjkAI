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
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useThreads } from '@/hooks/useThreads';

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
  const { threads, loading: threadsLoading, deleteThread } = useThreads();

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
    }
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
        <div className="px-4 py-3 flex items-center justify-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-700 bg-clip-text text-transparent group-data-[collapsible=icon]:text-base">
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
                <SidebarMenuButton onClick={handleNewChat}>
                  <Plus />
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
              {threadsLoading ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">Loading...</div>
              ) : threads.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">No chats yet</div>
              ) : (
                threads.slice(0, 10).map((thread) => (
                  <SidebarMenuItem key={thread.id}>
                    <div className="group flex items-center gap-1">
                      <SidebarMenuButton 
                        onClick={() => handleThreadClick(thread.id)}
                        isActive={currentThreadId === thread.id}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="truncate">{thread.title || 'New Chat'}</span>
                      </SidebarMenuButton>
                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                        title="Delete chat"
                      >
                        <LogOut className="h-3 w-3 text-destructive" />
                      </button>
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
                <SidebarMenuButton>
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-red-600 text-white text-xs">
                      {user?.email?.substring(0, 2).toUpperCase() || 'JK'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.email || 'User'}</span>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
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
