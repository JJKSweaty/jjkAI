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
      
      setThreads([data, ...threads]);
      console.log('createThread: Thread added to state, total threads:', threads.length + 1);
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
      
      setThreads(threads.map(t => t.id === threadId ? { ...t, ...updates } : t));
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
      
      setThreads(threads.filter(t => t.id !== threadId));
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
