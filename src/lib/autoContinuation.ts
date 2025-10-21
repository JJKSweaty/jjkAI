import { ConversationSummary, ContinuationContext, DepthMode } from './tokenOptimization';

export class AutoContinuationHandler {
  private maxContinuations = 6;
  protected continuationHistory = new Map<string, number>();

  async handleContinuation(
    originalRequest: any,
    response: string,
    finishReason: string,
    threadId?: string
  ): Promise<{ shouldContinue: boolean; continuationRequest?: any }> {
    
    // Only continue for DeepDive mode and length finish reason
    if (originalRequest.metadata?.depthMode !== 'DeepDive' || finishReason !== 'length') {
      return { shouldContinue: false };
    }

    // Check continuation limit
    const continuationCount = this.continuationHistory.get(threadId || 'default') || 0;
    if (continuationCount >= this.maxContinuations) {
      console.log(`[AutoContinuation] Max continuations (${this.maxContinuations}) reached for thread ${threadId}`);
      return { shouldContinue: false };
    }

    // Create continuation request
    const continuationRequest = this.buildContinuationRequest(originalRequest, response, continuationCount);
    
    // Update continuation count
    this.continuationHistory.set(threadId || 'default', continuationCount + 1);

    return {
      shouldContinue: true,
      continuationRequest
    };
  }

  private buildContinuationRequest(originalRequest: any, previousResponse: string, continuationIndex: number): any {
    // Build minimal context for continuation
    const continuationPrompt = this.buildContinuationPrompt(previousResponse, continuationIndex);
    
    // Create simplified context - just system + continuation instruction
    const continuationMessages = [
      {
        role: 'user',
        content: continuationPrompt
      }
    ];

    // Reduce token budget for continuation to leave room for response
    const originalBudget = originalRequest.metadata?.tokenBudget;
    const continuationBudget = {
      ...originalBudget,
      maxOutput: Math.min(originalBudget?.maxOutput || 1200, 800) // Smaller chunks for continuations
    };

    return {
      ...originalRequest,
      messages: continuationMessages,
      max_tokens: continuationBudget.maxOutput,
      metadata: {
        ...originalRequest.metadata,
        isContinuation: true,
        continuationIndex,
        tokenBudget: continuationBudget
      }
    };
  }

  private buildContinuationPrompt(previousResponse: string, continuationIndex: number): string {
    // Analyze what was being done when cut off
    const lastLine = previousResponse.trim().split('\n').pop() || '';
    const inCodeBlock = previousResponse.includes('```') && !previousResponse.endsWith('```');
    const inList = lastLine.match(/^[\s]*[-*]\s/) || lastLine.match(/^[\s]*\d+\.\s/);
    
    let prompt = `Continue exactly where you left off. Do NOT repeat previous content.`;
    
    if (inCodeBlock) {
      prompt += ` You were in a code block - reopen it and continue the code.`;
    } else if (inList) {
      prompt += ` Continue the list from where it ended.`;
    } else if (lastLine.endsWith(':')) {
      prompt += ` Continue from the section that was just started.`;
    } else {
      prompt += ` Resume from the last unfinished sentence.`;
    }

    if (continuationIndex === 0) {
      prompt += ` This is the first continuation.`;
    } else if (continuationIndex >= 3) {
      prompt += ` This is continuation ${continuationIndex + 1}. Consider wrapping up soon with a summary.`;
    }

    return prompt;
  }

  // Reset continuation count for a thread
  resetContinuationCount(threadId?: string): void {
    this.continuationHistory.delete(threadId || 'default');
  }

  // Get current continuation count
  getContinuationCount(threadId?: string): number {
    return this.continuationHistory.get(threadId || 'default') || 0;
  }

  // Clean up old continuation histories (call periodically)
  cleanup(): void {
    // Keep only recent threads (simple cleanup - in production use LRU cache)
    if (this.continuationHistory.size > 100) {
      const entries = Array.from(this.continuationHistory.entries());
      entries.slice(0, 50).forEach(([key]) => {
        this.continuationHistory.delete(key);
      });
    }
  }
}

// Section-based continuation for structured responses
export class SectionContinuationHandler extends AutoContinuationHandler {
  private async detectSections(response: string): Promise<string[]> {
    // Simple section detection based on headers
    const lines = response.split('\n');
    const sections: string[] = [];
    
    for (const line of lines) {
      // Detect markdown headers or numbered sections
      if (line.match(/^#{1,3}\s+/) || line.match(/^\d+\.\s+[A-Z]/)) {
        sections.push(line.trim());
      }
    }
    
    return sections;
  }

  async handleStructuredContinuation(
    originalRequest: any,
    response: string,
    finishReason: string,
    threadId?: string
  ): Promise<{ shouldContinue: boolean; continuationRequest?: any; sectionContext?: any }> {
    
    const sections = await this.detectSections(response);
    
    if (sections.length === 0) {
      // Fall back to regular continuation
      return super.handleContinuation(originalRequest, response, finishReason, threadId);
    }

    // Build section-aware continuation
    const continuationIndex = this.getContinuationCount(threadId);
    const nextSectionIndex = continuationIndex + 1;
    
    if (nextSectionIndex >= sections.length) {
      return { shouldContinue: false };
    }

    const sectionPrompt = `Continue with Section ${nextSectionIndex + 1}: "${sections[nextSectionIndex]}". 
Provide detailed content for this section only. Do not repeat previous sections.`;

    const continuationRequest = {
      ...originalRequest,
      messages: [
        {
          role: 'user',
          content: sectionPrompt
        }
      ],
      metadata: {
        ...originalRequest.metadata,
        isContinuation: true,
        continuationIndex,
        sectionIndex: nextSectionIndex,
        totalSections: sections.length
      }
    };

    this.continuationHistory.set(threadId || 'default', continuationIndex + 1);

    return {
      shouldContinue: true,
      continuationRequest,
      sectionContext: {
        currentSection: nextSectionIndex,
        totalSections: sections.length,
        sectionTitle: sections[nextSectionIndex]
      }
    };
  }
}

// Export singleton instances
export const autoContinuation = new AutoContinuationHandler();
export const sectionContinuation = new SectionContinuationHandler();