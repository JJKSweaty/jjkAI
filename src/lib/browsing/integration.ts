// Browsing Integration - Connect PRRA system with existing chat infrastructure

import { browsingController, type BrowsingConfig } from './controller';
import { CitationFormatter, type Source } from './citations';
import { AutoContinuationHandler } from '../autoContinuation';
import { ResponseCompressor } from '../responseCompressor';
import type { DepthMode } from '../tokenOptimization';

export interface BrowsingOptions {
  enabled: boolean;
  preference: 'always' | 'auto' | 'never';
  depthMode: DepthMode;
  maxSources?: number;
  recencyDays?: number;
  userTimezone?: string;
}

export interface EnhancedMessage {
  content: string;
  sources?: Source[];
  browsingMetadata?: {
    searchesUsed: number;
    sourcesUsed: number;
    tokensUsed: number;
  };
}

export class BrowsingIntegration {
  private continuationHandler = new AutoContinuationHandler();
  private compressor = new ResponseCompressor();

  // Main integration point: enhance a message with browsing
  async enhanceWithBrowsing(
    userMessage: string,
    conversationContext: string,
    options: BrowsingOptions
  ): Promise<EnhancedMessage | null> {
    if (!options.enabled) return null;

    // Configure browsing based on depth mode
    const config = this.getBrowsingConfig(options);
    const { BrowsingController } = await import('./controller');
    const controller = new BrowsingController(config);

    // Execute browsing
    const result = await controller.answerWithBrowsing(
      userMessage,
      conversationContext,
      options.preference
    );

    if (!result) return null;

    // Format answer with citations
    let enhancedContent = result.answer;

    // Apply compression for Quick/Standard modes
    if (options.depthMode === 'Quick' || options.depthMode === 'Standard') {
      const compressionLevel = options.depthMode === 'Quick' ? 2 : 1;
      enhancedContent = this.compressor.compress(
        enhancedContent,
        compressionLevel
      );
    }

    // Ensure citations are valid and deduplicated
    enhancedContent = CitationFormatter.dedupeCitations(enhancedContent);
    
    // Convert relative dates to absolute
    enhancedContent = CitationFormatter.convertRelativeToAbsolute(enhancedContent);

    // Attach source list
    enhancedContent = CitationFormatter.attachSourceList(
      enhancedContent,
      result.sources
    );

    return {
      content: enhancedContent,
      sources: result.sources,
      browsingMetadata: {
        searchesUsed: result.searchesUsed,
        sourcesUsed: result.sourcesUsed,
        tokensUsed: result.tokensUsed,
      },
    };
  }

  // Get browsing config based on depth mode
  private getBrowsingConfig(options: BrowsingOptions): Partial<BrowsingConfig> {
    const baseConfig: Partial<BrowsingConfig> = {
      userTimezone: options.userTimezone || 'UTC',
      recencyDays: options.recencyDays,
    };

    switch (options.depthMode) {
      case 'Quick':
        return {
          ...baseConfig,
          maxSearches: 1,
          maxSources: 2,
          maxTokensPerSource: 40,
        };

      case 'Standard':
        return {
          ...baseConfig,
          maxSearches: 2,
          maxSources: 3,
          maxTokensPerSource: 60,
        };

      case 'DeepDive':
        return {
          ...baseConfig,
          maxSearches: 3,
          maxSources: options.maxSources || 4,
          maxTokensPerSource: 80,
        };

      default:
        return baseConfig;
    }
  }

  // Handle continuation for long browsing answers
  async handleContinuation(
    previousAnswer: string,
    sources: Source[],
    threadId: string,
    messageId: string,
    originalRequest: any
  ): Promise<string> {
    // Check if continuation is needed
    if (!this.needsContinuation(previousAnswer)) {
      return previousAnswer;
    }

    // Build continuation request
    const continuationResult = await this.continuationHandler.handleContinuation(
      originalRequest,
      previousAnswer,
      'length',
      threadId
    );

    if (!continuationResult.shouldContinue || !continuationResult.continuationRequest) {
      return previousAnswer;
    }

    // In production: send continuationRequest to LLM and get response
    // For now, return original answer
    return previousAnswer;
  }

  // Check if answer needs continuation
  private needsContinuation(answer: string): boolean {
    // Check for truncation indicators
    const truncationPatterns = [
      /\.\.\.$/, // Ends with ...
      /\w+$/, // Ends mid-word
      /[^.!?]$/, // Doesn't end with punctuation
    ];

    // Check length (if very long, might be truncated)
    const isLong = answer.length > 3000;

    return isLong && truncationPatterns.some(p => p.test(answer.trim()));
  }

  // Build continuation prompt with sources
  private buildContinuationPrompt(
    previousAnswer: string,
    sources: Source[]
  ): string {
    let prompt = 'Continue from where you left off:\n\n';
    prompt += previousAnswer.slice(-200); // Last 200 chars
    prompt += '\n\n[Continue here...]\n\n';
    
    // Reattach sources for reference
    prompt += 'Available sources:\n';
    sources.forEach(source => {
      prompt += `[${source.index}] ${source.title}\n`;
    });

    return prompt;
  }

  // Merge continuation with original answer
  private mergeContinuation(original: string, continuation: string): string {
    // Remove source list from original if present
    const sourcePattern = /\n\n\*\*Sources:\*\*\n[\s\S]*$/;
    const originalWithoutSources = original.replace(sourcePattern, '');

    // Combine
    return `${originalWithoutSources}\n\n${continuation}`;
  }

  // Format browsing metadata for UI display
  formatBrowsingMetadata(metadata: {
    searchesUsed: number;
    sourcesUsed: number;
    tokensUsed: number;
  }): string {
    return `Browsed ${metadata.sourcesUsed} sources (${metadata.searchesUsed} searches, ${metadata.tokensUsed} tokens)`;
  }

  // Validate sources are accessible and fresh
  async validateSources(sources: Source[]): Promise<Source[]> {
    const validSources: Source[] = [];

    for (const source of sources) {
      // Check if URL is still accessible (basic check)
      try {
        const url = new URL(source.url);
        
        // Skip invalid protocols
        if (!['http:', 'https:'].includes(url.protocol)) {
          continue;
        }

        // Check if published date is reasonable
        if (source.published) {
          const publishedTime = new Date(source.published).getTime();
          const now = Date.now();
          
          // Skip if date is in the future or too old (>10 years)
          if (publishedTime > now || publishedTime < now - 10 * 365 * 24 * 60 * 60 * 1000) {
            continue;
          }
        }

        validSources.push(source);
      } catch {
        // Skip invalid URLs
        continue;
      }
    }

    return validSources;
  }

  // Rerank sources based on user feedback
  rerankSources(
    sources: Source[],
    feedback: { sourceIndex: number; helpful: boolean }[]
  ): Source[] {
    const scores = new Map<number, number>();

    // Initialize with equal scores
    sources.forEach(s => scores.set(s.index, 1.0));

    // Adjust based on feedback
    feedback.forEach(({ sourceIndex, helpful }) => {
      const current = scores.get(sourceIndex) || 1.0;
      scores.set(sourceIndex, helpful ? current + 0.2 : current - 0.2);
    });

    // Sort by score
    return sources
      .map(s => ({ ...s, score: scores.get(s.index) || 1.0 }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...source }) => source);
  }
}

export const browsingIntegration = new BrowsingIntegration();