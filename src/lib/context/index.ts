export * from './ResponseCompressor';
export * from '../contextManager'; // This assumes contextManager.ts is in the parent lib directory

// Re-export types for convenience
export type { ContextChunk } from '../contextManager';

// Helper function to initialize the context management system
export function initializeContextSystem(options: {
  model?: string;
  maxChunks?: number;
  defaultTokenBudget?: number;
} = {}) {
  return {
    responseCompressor: new (require('./ResponseCompressor').ResponseCompressor)(),
    contextManager: new (require('../contextManager').ContextManager)(
      options.model,
      options.maxChunks
    ),
  };
}

// Example usage:
/*
import { initializeContextSystem } from './lib/context';

const { contextManager, responseCompressor } = initializeContextSystem({
  model: 'claude-3-7-sonnet-20250219',
  maxChunks: 20
});

// Add response to context
await contextManager.addResponseChunk('Some response text', { source: 'user' });

// Add document chunks
contextManager.addDocumentChunks([
  { content: 'Document text 1', metadata: { source: 'doc1' } },
  { content: 'Document text 2', metadata: { source: 'doc2' } }
]);

// Get optimized context
const context = contextManager.getOptimizedContext();
*/

// This file serves as the main entry point for the context management system,
// making it easy to import and use the context management functionality
// throughout the application.
