import { responseCompressor } from './responseCompressor';
import { TokenManager } from './tokenOptimization';

export interface ContextChunk {
  id: string;
  content: string;
  tokens: number;
  source: 'document' | 'response';
  createdAt: Date;
  metadata: Record<string, any>;
}

export class ContextManager {
  private tokenManager: TokenManager;
  private maxChunks: number;
  private chunks: ContextChunk[] = [];
  private tokenBudget: number;

  constructor(model: string = 'claude-3-7-sonnet-20250219', maxChunks: number = 20) {
    this.tokenManager = new TokenManager(model);
    this.maxChunks = maxChunks;
    this.tokenBudget = this.tokenManager.getTokenBudget('Standard').maxInput;
  }

  /**
   * Add a new context chunk from a response
   */
  async addResponseChunk(response: string, metadata: Record<string, any> = {}): Promise<void> {
    // Compress the response to reduce token usage
    const compressed = await responseCompressor.compress(response, 0.4); // Target 40% reduction
    
    // Estimate tokens for the compressed content
    const tokenCount = Math.ceil(compressed.length / 4); // Rough estimate
    
    const chunk: ContextChunk = {
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: compressed,
      tokens: tokenCount,
      source: 'response',
      createdAt: new Date(),
      metadata: {
        ...metadata,
        originalLength: response.length,
        compressedLength: compressed.length,
        compressionRatio: response.length > 0 ? (1 - (compressed.length / response.length)).toFixed(2) : 0,
      }
    };
    
    this.chunks.unshift(chunk); // Add to beginning (most recent first)
    this.cleanup();
  }

  /**
   * Add document chunks to context
   */
  addDocumentChunks(documentChunks: Array<{ content: string, metadata?: Record<string, any> }>): void {
    documentChunks.forEach(doc => {
      const tokenCount = Math.ceil(doc.content.length / 4); // Rough estimate
      
      this.chunks.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: doc.content,
        tokens: tokenCount,
        source: 'document',
        createdAt: new Date(),
        metadata: doc.metadata || {}
      });
    });
    
    this.cleanup();
  }

  /**
   * Get optimized context for the next request
   */
  getOptimizedContext(targetTokens: number = this.tokenBudget * 0.7): string {
    let totalTokens = 0;
    const selectedChunks: ContextChunk[] = [];
    
    // Always prioritize document chunks first
    const documentChunks = this.chunks.filter(c => c.source === 'document');
    const responseChunks = this.chunks.filter(c => c.source === 'response');
    
    // Add document chunks first (most recent first)
    for (let i = documentChunks.length - 1; i >= 0; i--) {
      const chunk = documentChunks[i];
      if (totalTokens + chunk.tokens <= targetTokens) {
        selectedChunks.unshift(chunk); // Add to beginning to maintain order
        totalTokens += chunk.tokens;
      } else {
        // If we can't fit the whole chunk, try to split it
        const remainingTokens = targetTokens - totalTokens;
        if (remainingTokens > 100) { // Only if we have a meaningful amount of tokens left
          const partialContent = this.truncateToTokens(chunk.content, remainingTokens);
          selectedChunks.unshift({
            ...chunk,
            content: partialContent,
            tokens: remainingTokens,
            metadata: {
              ...chunk.metadata,
              isPartial: true
            }
          });
          break;
        }
      }
    }
    
    // Then add response chunks (most recent first)
    for (const chunk of responseChunks) {
      if (totalTokens + chunk.tokens <= targetTokens) {
        selectedChunks.push(chunk);
        totalTokens += chunk.tokens;
      } else {
        // If we can't fit the whole chunk, try to split it
        const remainingTokens = targetTokens - totalTokens;
        if (remainingTokens > 100) { // Only if we have a meaningful amount of tokens left
          const partialContent = this.truncateToTokens(chunk.content, remainingTokens);
          selectedChunks.push({
            ...chunk,
            content: partialContent,
            tokens: remainingTokens,
            metadata: {
              ...chunk.metadata,
              isPartial: true
            }
          });
          break;
        }
      }
    }
    
    // Format the context with metadata
    return selectedChunks.map(chunk => {
      const source = chunk.source === 'document' 
        ? 'Document' 
        : `Previous Response (${chunk.metadata.compressionRatio ? `compressed ${chunk.metadata.compressionRatio*100}%` : 'optimized'})`;
      
      return `[${source} - ${chunk.tokens} tokens]\n${chunk.content}\n`;
    }).join('\n---\n');
  }

  /**
   * Clean up old chunks to maintain memory efficiency
   */
  private cleanup(): void {
    // Remove chunks if we exceed the maximum count
    while (this.chunks.length > this.maxChunks) {
      // Remove the oldest response chunk first, but always keep document chunks
      const oldestResponseIndex = this.chunks.findIndex(c => c.source === 'response');
      if (oldestResponseIndex === -1) {
        // If no response chunks, remove the oldest document chunk
        this.chunks.shift();
      } else {
        this.chunks.splice(oldestResponseIndex, 1);
      }
    }
  }

  /**
   * Helper to truncate text to a specific number of tokens
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const words = text.split(/\s+/);
    const estimatedTokens = Math.min(words.length, maxTokens * 2); // Rough estimate
    return words.slice(0, estimatedTokens).join(' ');
  }

  /**
   * Clear all context chunks
   */
  clear(): void {
    this.chunks = [];
  }
}

// Export a singleton instance
export const contextManager = new ContextManager();
