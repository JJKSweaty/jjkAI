import { useState, useEffect, useCallback } from 'react';
import { PromptEngine, DialogueState, SelectiveRecallSnippet } from '@/lib/promptFramework';
import { DepthMode } from '@/lib/tokenOptimization';

export function usePromptFramework(initialState?: Partial<DialogueState>) {
  const [promptEngine] = useState(() => {
    const engine = new PromptEngine();
    if (initialState) {
      engine.updateDialogueState(initialState);
    }
    return engine;
  });

  // Add a new message to the conversation
  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    promptEngine.addTurn(role, content);
  }, [promptEngine]);

  // Update the dialogue state
  const updateDialogueState = useCallback((updates: Partial<DialogueState>) => {
    promptEngine.updateDialogueState(updates);
  }, [promptEngine]);

  // Add relevant snippets from the knowledge base
  const addSnippets = useCallback((snippets: SelectiveRecallSnippet[]) => {
    promptEngine.addSelectiveSnippets(snippets);
  }, [promptEngine]);

  // Generate a prompt for the LLM
  const generatePrompt = useCallback((userMessage: string, depthMode: DepthMode = 'Standard') => {
    return promptEngine.generatePrompt(userMessage, depthMode);
  }, [promptEngine]);

  // Get the current dialogue state (for persistence)
  const getDialogueState = useCallback(() => {
    return promptEngine.getDialogueState();
  }, [promptEngine]);

  // Load dialogue state (e.g., from a saved session)
  const loadDialogueState = useCallback((state: DialogueState) => {
    promptEngine.loadDialogueState(state);
  }, [promptEngine]);

  return {
    addMessage,
    updateDialogueState,
    addSnippets,
    generatePrompt,
    getDialogueState,
    loadDialogueState
  };
}

// Hook to integrate with your existing chat system
export function useChatWithPromptFramework(threadId: string | null) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const {
    addMessage,
    updateDialogueState,
    addSnippets,
    generatePrompt,
    getDialogueState,
    loadDialogueState
  } = usePromptFramework();

  // Load saved dialogue state when thread changes
  useEffect(() => {
    if (!threadId) return;
    
    const loadState = async () => {
      try {
        setIsLoading(true);
        // In a real app, you would load the state from your database
        // const savedState = await loadDialogueStateFromDB(threadId);
        // if (savedState) {
        //   loadDialogueState(savedState);
        // }
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load dialogue state'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadState();
  }, [threadId, loadDialogueState]);

  // Save dialogue state when it changes
  const saveDialogueState = useCallback(async () => {
    if (!threadId) return;
    
    try {
      const state = getDialogueState();
      // In a real app, you would save the state to your database
      // await saveDialogueStateToDB(threadId, state);
    } catch (err) {
      console.error('Failed to save dialogue state:', err);
    }
  }, [threadId, getDialogueState]);

  // Generate a response using the prompt framework
  const generateResponse = useCallback(async (userMessage: string, depthMode: DepthMode = 'Standard') => {
    try {
      setIsLoading(true);
      
      // Add user message to the conversation
      addMessage('user', userMessage);
      
      // Generate the prompt
      const prompt = generatePrompt(userMessage, depthMode);
      
      // Call your LLM API here
      // const response = await callLLM(prompt, {
      //   max_tokens: 512, // Adjust based on depth mode
      //   temperature: 0.7,
      //   // Other parameters...
      // });
      
      // For now, we'll just return a placeholder
      const response = {
        content: "This is a placeholder response. In a real implementation, this would be the LLM's response.",
        finish_reason: 'stop'
      };
      
      // Add assistant's response to the conversation
      if (response.content) {
        addMessage('assistant', response.content);
      }
      
      // Save the updated dialogue state
      await saveDialogueState();
      
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate response'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, generatePrompt, saveDialogueState]);

  return {
    isInitialized,
    isLoading,
    error,
    generateResponse,
    updateDialogueState,
    addSnippets,
    getDialogueState
  };
}
