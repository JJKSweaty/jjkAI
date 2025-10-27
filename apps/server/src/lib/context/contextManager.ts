/**
 * Server-side context manager for combining conversation history with RAG results.
 */

import { ResponseCompressor } from "../responseCompressor.js";

export type ContextRole = "user" | "assistant" | "document";

export interface ContextChunk {
  id: string;
  role: ContextRole;
  content: string;
  tokens: number;
  createdAt: Date;
  metadata: Record<string, any>;
}

function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class ContextManager {
  private chunks: ContextChunk[] = [];

  constructor(
    private readonly tokenBudget: number = 12000,
    private readonly maxChunks: number = 40
  ) {}

  async addResponseChunk(
    content: string,
    role: ContextRole,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!content?.trim()) return;

    const optimized = await ResponseCompressor.optimizeForContext(content);
    const tokens = estimateTokens(optimized);

    const chunk: ContextChunk = {
      id: generateId("ctx"),
      role,
      content: optimized,
      tokens,
      createdAt: new Date(),
      metadata: {
        originalLength: content.length,
        optimizedLength: optimized.length,
        compressionRatio:
          content.length > 0
            ? Number(((1 - optimized.length / content.length) * 100).toFixed(2))
            : 0,
        ...metadata,
      },
    };

    // Newest first
    this.chunks.unshift(chunk);
    this.cleanup();
  }

  addDocumentChunks(
    documentChunks: Array<{ content: string; metadata?: Record<string, any> }>
  ): void {
    if (!documentChunks?.length) return;

    documentChunks.forEach((doc) => {
      const content = doc.content?.trim();
      if (!content) return;

      const chunk: ContextChunk = {
        id: generateId("doc"),
        role: "document",
        content,
        tokens: estimateTokens(content),
        createdAt: new Date(),
        metadata: {
          ...doc.metadata,
        },
      };

      this.chunks.push(chunk);
    });

    this.cleanup();
  }

  getOptimizedContext(targetTokens: number = this.tokenBudget * 0.7): string {
    const documentContext = this.getDocumentContext(targetTokens * 0.6);
    const conversationContext = this.getConversationContext(targetTokens * 0.4);

    return [documentContext, conversationContext]
      .filter((section) => section.length > 0)
      .join("\n---\n");
  }

  clear(): void {
    this.chunks = [];
  }

  resetTo(metadataFilter: (chunk: ContextChunk) => boolean): void {
    this.chunks = this.chunks.filter(metadataFilter);
  }

  private cleanup(): void {
    if (this.chunks.length <= this.maxChunks) return;
    this.chunks = this.chunks.slice(0, this.maxChunks);
  }

  getConversationContext(targetTokens: number = this.tokenBudget * 0.4): string {
    return this.buildContextForRoles(["assistant", "user"], targetTokens);
  }

  getDocumentContext(targetTokens: number = this.tokenBudget * 0.6): string {
    return this.buildContextForRoles(["document"], targetTokens);
  }

  private buildContextForRoles(
    roles: ContextRole[],
    targetTokens: number
  ): string {
    let totalTokens = 0;
    const selected: ContextChunk[] = [];

    for (const chunk of this.chunks) {
      if (!roles.includes(chunk.role)) continue;

      if (totalTokens + chunk.tokens > targetTokens) {
        continue;
      }

      selected.push(chunk);
      totalTokens += chunk.tokens;
    }

    if (selected.length === 0) return "";

    return selected
      .reverse()
      .map((chunk) => {
        const header = `[${chunk.role.toUpperCase()} - ${chunk.tokens} tokens]`;
        return `${header}\n${chunk.content}`;
      })
      .join("\n---\n");
  }
}

const sessionContexts = new Map<string, ContextManager>();

export function getContextManager(sessionId: string): ContextManager {
  const key = sessionId || "default";
  if (!sessionContexts.has(key)) {
    sessionContexts.set(key, new ContextManager());
  }
  return sessionContexts.get(key)!;
}

export function clearContext(sessionId: string): void {
  sessionContexts.delete(sessionId);
}

export function clearAllContexts(): void {
  sessionContexts.clear();
}
