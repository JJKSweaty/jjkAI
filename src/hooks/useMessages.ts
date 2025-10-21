import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DbMessage } from '@/lib/database.types';
import { Message } from '@/lib/types';

export function useMessages(threadId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    fetchMessages();
  }, [threadId]);

  const fetchMessages = async () => {
    if (!threadId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data?.map(m => ({
        role: m.role,
        content: m.content,
      })) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMessage = async (message: Message) => {
    if (!threadId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role: message.role,
          content: message.content,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const saveMessages = async (newMessages: Message[], overrideThreadId?: string) => {
    const activeThreadId = overrideThreadId || threadId;
    console.log('saveMessages called:', { activeThreadId, threadId, overrideThreadId, messageCount: newMessages.length });
    
    if (!activeThreadId) {
      console.error('No thread ID available for saving messages');
      return;
    }

    try {
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Not authenticated - cannot save messages');
        return;
      }

      console.log('Authenticated user:', user.id);

      // Ensure thread exists and belongs to current user using RPC
      console.log('Claiming/creating thread:', activeThreadId);
      const { data: claimedId, error: claimError } = await supabase.rpc('create_or_claim_thread', {
        p_id: activeThreadId,
        p_title: 'New chat',
        p_model: 'claude-3-5-haiku-latest',
      });

      if (claimError) {
        console.error('Failed to claim thread:', claimError);
        throw claimError;
      }

      console.log('Thread claimed:', claimedId);

      // Now insert messages
      const messagesToInsert = newMessages.map((m: Message) => ({
        thread_id: activeThreadId,
        role: m.role,
        content: m.content,
      }));
      
      console.log('Inserting messages:', messagesToInsert);
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messagesToInsert)
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      console.log('✅ Messages saved successfully:', data);
    } catch (error) {
      console.error('❌ Error saving messages:', error);
    }
  };

  return {
    messages,
    loading,
    setMessages,
    saveMessage,
    saveMessages,
    refreshMessages: fetchMessages,
  };
}
