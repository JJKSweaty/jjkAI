import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Thread, DbMessage } from '@/lib/database.types';
import { useAuth } from './useAuth';

export function useThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setThreads([]);
      setLoading(false);
      return;
    }

    console.log('useThreads: Fetching threads for user:', user.id);
    fetchThreads();

    // REAL-TIME UPDATES: Subscribe to thread changes for multi-tab sync
    const channel = supabase
      .channel('threads_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'threads',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time INSERT:', payload.new);
          // Add new thread to the list if not already present
          setThreads(prevThreads => {
            const exists = prevThreads.some(t => t.id === payload.new.id);
            if (exists) return prevThreads;
            return [payload.new as Thread, ...prevThreads];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'threads',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time UPDATE:', payload.new);
          setThreads(prevThreads =>
            prevThreads.map(t => t.id === payload.new.id ? payload.new as Thread : t)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'threads',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Real-time DELETE:', payload.old);
          setThreads(prevThreads => prevThreads.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('useThreads: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchThreads = async () => {
    console.log('fetchThreads: Starting fetch...');
    try {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .order('updated_at', { ascending: false });

      console.log('fetchThreads: Result:', { data, error, count: data?.length });
      
      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const createThread = async (model: string, title?: string) => {
    if (!user) {
      console.error('createThread: No user found');
      return null;
    }

    console.log('createThread: Creating thread with:', { model, title, userId: user.id });
    
    try {
      const { data, error } = await supabase
        .from('threads')
        .insert({
          user_id: user.id,
          model,
          title: title || 'New Chat',
        })
        .select()
        .single();

      console.log('createThread: Result:', { data, error });

      if (error) throw error;
      
      // FIXED: Use functional update to avoid stale closure
      setThreads(prevThreads => {
        console.log('createThread: Adding to threads. Previous count:', prevThreads.length);
        return [data, ...prevThreads];
      });
      
      console.log('createThread: Thread created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('Error creating thread:', error);
      return null;
    }
  };

  const updateThread = async (threadId: string, updates: Partial<Thread>) => {
    try {
      const { error } = await supabase
        .from('threads')
        .update(updates)
        .eq('id', threadId);

      if (error) throw error;
      
      // FIXED: Use functional update to avoid stale closure
      setThreads(prevThreads => 
        prevThreads.map(t => t.id === threadId ? { ...t, ...updates } : t)
      );
    } catch (error) {
      console.error('Error updating thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const { error } = await supabase
        .from('threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;
      
      // FIXED: Use functional update to avoid stale closure
      setThreads(prevThreads => prevThreads.filter(t => t.id !== threadId));
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  return {
    threads,
    loading,
    createThread,
    updateThread,
    deleteThread,
    refreshThreads: fetchThreads,
  };
}
