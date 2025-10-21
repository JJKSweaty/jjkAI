// Depth Mode Token Management System
// Implements adaptive token budgeting and conversation optimization

export type DepthMode = 'Quick' | 'Standard' | 'DeepDive';

export interface TokenBudget {
  maxInput: number;
  maxOutput: number;
  safetyMargin: number;
  reasoningEffort: 'low' | 'medium' | 'high';
  temperature: number;
  topP: number;
  allowTools: boolean;
  allowCitations: boolean;
}

export interface ConversationSummary {
  runningSummary: string; // 200-600 tokens
  pinnedFacts: string[];  // Short bullets
  workingSet: any[];      // Last few turns
  tokenCount: number;
}

export interface ContinuationContext {
  isResume: boolean;
  previousText: string;
  sectionIndex?: number;
  totalSections?: number;
}

// Model context windows (conservative estimates)
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-3-5-haiku-latest': 200000,
  'claude-3-5-sonnet-latest': 200000, 
  'claude-3-opus-latest': 200000,
  'claude-sonnet-4-5-20250929': 200000,
  'claude-opus-4-1-20250805': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-haiku-4-5-20251001': 200000,
};

export class TokenManager {
  private contextWindow: number;
  
  constructor(model: string) {
    this.contextWindow = MODEL_CONTEXT_WINDOWS[model] || 128000;
  }

  // Determine depth mode from user message
  planDepthMode(userMessage: string, explicitMode?: DepthMode): DepthMode {
    if (explicitMode) return explicitMode;
    
    const length = userMessage.length;
    const content = userMessage.toLowerCase();
    
    // Quick indicators
    if (length < 200 || 
        content.includes('summarize') ||
        content.match(/^(what|who|when|where|how much|is it)/)) {
      return 'Quick';
    }
    
    // Deep dive indicators
    if (content.match(/tutorial|step[- ]?by[- ]?step|design|explain in detail|comprehensive|thorough|guide|walkthrough/i) ||
        length > 800) {
      return 'DeepDive';
    }
    
    return 'Standard';
  }

  // Get token budget for depth mode
  getTokenBudget(mode: DepthMode): TokenBudget {
    const budgets: Record<DepthMode, TokenBudget> = {
      Quick: {
        maxInput: 4000,
        maxOutput: 500,
        safetyMargin: 256,
        reasoningEffort: 'low',
        temperature: 0.3,
        topP: 0.8,
        allowTools: false,
        allowCitations: false,
      },
      Standard: {
        maxInput: 8000,
        maxOutput: 900,
        safetyMargin: 512,
        reasoningEffort: 'medium',
        temperature: 0.5,
        topP: 0.9,
        allowTools: true,
        allowCitations: true,
      },
      DeepDive: {
        maxInput: 16000,
        maxOutput: 1200,
        safetyMargin: 1024,
        reasoningEffort: 'high',
        temperature: 0.6,
        topP: 0.95,
        allowTools: true,
        allowCitations: true,
      },
    };
    
    return budgets[mode];
  }

  // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Calculate adaptive max output tokens based on remaining budget
  calculateMaxOutput(inputTokens: number, desiredMax: number, safetyMargin: number = 256): number {
    const remaining = Math.max(0, this.contextWindow - inputTokens - safetyMargin);
    return Math.max(256, Math.min(desiredMax, remaining));
  }

  // Build system prompt for depth mode
  buildSystemPrompt(mode: DepthMode): string {
    const basePrompt = "You are Claude, a helpful AI assistant.";
    
    const modeInstructions: Record<DepthMode, string> = {
      Quick: `
DepthMode=Quick → Be concise, avoid lists unless asked, no step-by-step.
- Use ≤150 words
- Never repeat user's text  
- Prefer 3 bullets over paragraphs
- No tools unless essential
- Direct answers only`,

      Standard: `
DepthMode=Standard → Explain briefly; include 3–5 key points.
- Balanced depth, moderate detail
- Use tools when helpful
- Brief citations for claims
- 3-5 key points format
- Structured but concise`,

      DeepDive: `
DepthMode=DeepDive → Produce a clear outline first, then fill each section.
- Create structured outline first
- Fill sections methodically  
- Use tools extensively
- Comprehensive analysis
- Include examples and citations
- Multi-step approach allowed`,
    };

    return `${basePrompt}\n\n${modeInstructions[mode]}`;
  }
}

export class ConversationOptimizer {
  private maxSummaryTokens = 600;
  private maxPinnedFacts = 10;
  private maxWorkingSetTurns = 4;

  // Create rolling summary from conversation history
  async createRollingSummary(messages: any[]): Promise<ConversationSummary> {
    if (messages.length <= this.maxWorkingSetTurns) {
      return {
        runningSummary: "",
        pinnedFacts: [],
        workingSet: messages,
        tokenCount: this.estimateTokens(JSON.stringify(messages)),
      };
    }

    // Take recent messages as working set
    const workingSet = messages.slice(-this.maxWorkingSetTurns);
    const historyToSummarize = messages.slice(0, -this.maxWorkingSetTurns);

    // Extract key facts and create summary (this would call a summarization function)
    const summary = await this.summarizeHistory(historyToSummarize);
    const facts = this.extractPinnedFacts(historyToSummarize);

    return {
      runningSummary: summary,
      pinnedFacts: facts,
      workingSet,
      tokenCount: this.estimateTokens(summary + facts.join(' ') + JSON.stringify(workingSet)),
    };
  }

  // Summarize conversation history into key points
  private async summarizeHistory(messages: any[]): Promise<string> {
    // This would integrate with your Claude API to create a summary
    // For now, return a placeholder
    const keyPoints = messages
      .filter(m => m.role === 'user')
      .slice(-5)
      .map(m => `• ${m.content.substring(0, 50)}...`)
      .join('\n');
    
    return `Recent conversation summary:\n${keyPoints}`;
  }

  // Extract important facts that should be pinned
  private extractPinnedFacts(messages: any[]): string[] {
    const facts: string[] = [];
    
    // Look for important entities, decisions, constraints
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content) {
        // Extract decisions, names, IDs, constraints
        const content = msg.content.toLowerCase();
        if (content.includes('decision:') || content.includes('constraint:') || content.includes('requirement:')) {
          facts.push(msg.content.substring(0, 100));
        }
      }
    });

    return facts.slice(0, this.maxPinnedFacts);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export class AutoContinuation {
  private maxContinuations = 6;
  
  // Check if response was cut off due to length
  shouldContinue(finishReason: string, currentLength: number, targetLength: number): boolean {
    return finishReason === 'length' || finishReason === 'max_tokens';
  }

  // Build continuation prompt
  buildContinuationPrompt(context?: ContinuationContext): string {
    if (context?.sectionIndex && context?.totalSections) {
      return `Continue with Section ${context.sectionIndex + 1} of ${context.totalSections}. Do NOT repeat previous content.`;
    }
    
    return `You stopped due to length. Continue exactly where you left off.
Do NOT repeat previous text. Resume from the last unfinished sentence or bullet.
If you were in a code block, reopen it and complete it.`;
  }

  // Create minimal context for continuation
  buildContinuationContext(summary: ConversationSummary, previousText: string): any[] {
    return [
      {
        role: 'system',
        content: 'Continue the previous response. Context: ' + summary.runningSummary.substring(0, 200)
      },
      {
        role: 'user', 
        content: this.buildContinuationPrompt()
      }
    ];
  }
}

export class ResponseCompressor {
  // Compress response for Quick/Standard modes
  async compress(text: string, targetReduction: number = 0.25): Promise<string> {
    // This would integrate with Claude API for compression
    // For now, implement basic compression rules
    
    let compressed = text
      // Remove hedging words
      .replace(/\b(perhaps|maybe|possibly|likely|probably|seems?|appears?)\b/gi, '')
      // Remove redundant transitions  
      .replace(/\b(furthermore|moreover|additionally|in addition)\b/gi, '')
      // Compress repetitive phrases
      .replace(/\b(it is important to note that|it should be noted that)\b/gi, '')
      // Remove filler
      .replace(/\s+/g, ' ')
      .trim();

    return compressed;
  }
}

// Factory function to create optimized chat request
export function createOptimizedChatRequest(
  messages: any[],
  mode: DepthMode,
  model: string,
  summary?: ConversationSummary,
  continuation?: ContinuationContext
) {
  const tokenManager = new TokenManager(model);
  const budget = tokenManager.getTokenBudget(mode);
  
  // Build context
  let context = messages;
  if (summary && !continuation?.isResume) {
    // Use optimized context instead of full history
    context = [
      ...summary.workingSet
    ];
  }
  
  // Estimate input tokens
  const inputTokens = tokenManager.estimateTokens(JSON.stringify(context));
  const maxOutput = tokenManager.calculateMaxOutput(inputTokens, budget.maxOutput, budget.safetyMargin);
  
  return {
    model,
    messages: context,
    max_tokens: maxOutput,
    temperature: budget.temperature,
    top_p: budget.topP,
    system: tokenManager.buildSystemPrompt(mode),
    metadata: {
      depthMode: mode,
      tokenBudget: budget,
      estimatedInput: inputTokens,
      allowContinuation: mode === 'DeepDive'
    }
  };
}