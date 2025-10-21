// Auto-Continuation Handler for Server
// Handles automatic continuation when responses are cut off due to token limits

export class AutoContinuationHandler {
  // Mode-based continuation limits
  // HIGH LIMITS: Never interrupt coding/heavy work
  private continuationLimits = {
    'codegen-small': 50,       // Coding: 50 continuations (no interruption)
    'codegen-large': 100,      // Large coding: 100 continuations (unlimited effectively)
    'qa': 3,                   // QA: 3 continuations
    'bugfix': 50,              // Bugfix: 50 continuations (no interruption)
    'detailed': 100,           // Detailed: 100 continuations (unlimited effectively)
    'plan': 50,                // Planning: 50 continuations
    'summarize': 3,            // Summarize: 3 continuations
    'default': 20              // Default: 20 continuations
  };

  private continuationHistory = new Map<string, number>();

  async handleContinuation(
    originalRequest: any,
    response: string,
    finishReason: string,
    threadId?: string,
    taskClass?: string
  ): Promise<{ shouldContinue: boolean; continuationRequest?: any; promptUser?: boolean; cost?: number }> {
    
    // Only continue if we hit length limit
    if (finishReason !== 'max_tokens' && finishReason !== 'length') {
      return { shouldContinue: false };
    }

    // Get continuation limit based on task class
    const maxContinuations = this.continuationLimits[taskClass as keyof typeof this.continuationLimits] 
      || this.continuationLimits.default;

    // Check continuation limit
    const continuationCount = this.continuationHistory.get(threadId || 'default') || 0;
    
    // If we've exceeded the limit, prompt user before continuing
    if (continuationCount >= maxContinuations) {
      const estimatedCost = this.estimateContinuationCost(continuationCount);
      console.log(`[AutoContinuation] Limit reached (${continuationCount}/${maxContinuations}). Estimated cost: $${estimatedCost.toFixed(4)}`);
      
      return { 
        shouldContinue: false,
        promptUser: true,
        cost: estimatedCost
      };
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
    
    // Create simplified context - just continuation instruction
    const continuationMessages = [
      {
        role: 'user',
        content: continuationPrompt
      }
    ];

    return {
      model: originalRequest.model,
      max_tokens: originalRequest.max_tokens || 1024,
      temperature: originalRequest.temperature || 0.7,
      messages: continuationMessages,
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

  // Estimate cost of continuations (rough estimate)
  private estimateContinuationCost(continuationCount: number): number {
    // Rough estimate: each continuation ~1000 tokens output, ~500 tokens input
    // Haiku: $0.80 per million input, $4 per million output
    const avgInputTokens = 500;
    const avgOutputTokens = 1000;
    const inputCostPerToken = 0.0000008;  // $0.80 per million
    const outputCostPerToken = 0.000004;  // $4 per million
    
    return continuationCount * (
      (avgInputTokens * inputCostPerToken) + 
      (avgOutputTokens * outputCostPerToken)
    );
  }

  // Force continue despite limit (when user explicitly requests)
  async forceContinuation(
    originalRequest: any,
    response: string,
    threadId?: string
  ): Promise<{ continuationRequest: any }> {
    const continuationCount = this.getContinuationCount(threadId);
    const continuationRequest = this.buildContinuationRequest(originalRequest, response, continuationCount);
    
    this.continuationHistory.set(threadId || 'default', continuationCount + 1);
    
    return { continuationRequest };
  }
}

export const autoContinuation = new AutoContinuationHandler();