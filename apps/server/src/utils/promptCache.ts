import crypto from 'crypto';

interface CachedResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    estimatedCost: number;
  };
  timestamp: number;
  hitCount: number;
}

class PromptCache {
  private cache = new Map<string, CachedResponse>();
  private readonly maxCacheSize = 1000;
  private readonly maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

  private generateKey(messages: any[], model: string): string {
    // Create a hash of the conversation context for caching
    const content = messages.map(m => `${m.role}:${m.content}`).join('|');
    return crypto.createHash('sha256').update(`${model}:${content}`).digest('hex');
  }

  private isFrequentlyAsked(messages: any[]): boolean {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    // Common questions that benefit from caching
    const commonPatterns = [
      /how to/i,
      /what is/i,
      /explain/i,
      /difference between/i,
      /example of/i,
      /how do i/i,
      /tutorial/i,
      /guide/i
    ];
    
    return commonPatterns.some(pattern => pattern.test(lastMessage));
  }

  get(messages: any[], model: string): CachedResponse | null {
    if (!this.isFrequentlyAsked(messages)) {
      return null; // Don't cache complex/unique requests
    }

    const key = this.generateKey(messages, model);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache entry is too old
    if (Date.now() - cached.timestamp > this.maxAgeMs) {
      this.cache.delete(key);
      return null;
    }
    
    // Increment hit count
    cached.hitCount++;
    console.log(`Cache HIT for key ${key.substring(0, 8)}... (hits: ${cached.hitCount})`);
    
    return cached;
  }

  set(messages: any[], model: string, response: string, usage: any): void {
    if (!this.isFrequentlyAsked(messages)) {
      return; // Don't cache complex/unique requests
    }

    const key = this.generateKey(messages, model);
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      response,
      usage,
      timestamp: Date.now(),
      hitCount: 0
    });
    
    console.log(`Cached response for key ${key.substring(0, 8)}... (cache size: ${this.cache.size})`);
  }

  getStats(): { size: number; totalHits: number; hitRate: number } {
    let totalHits = 0;
    let totalRequests = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      totalRequests += entry.hitCount + 1; // +1 for the initial request
    }
    
    return {
      size: this.cache.size,
      totalHits,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const promptCache = new PromptCache();