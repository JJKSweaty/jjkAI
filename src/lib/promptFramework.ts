import { DepthMode } from './tokenOptimization';

export interface DialogueState {
  user_profile?: string;
  current_task?: string;
  constraints?: string[];
  preferences?: {
    style?: string;
    tone?: string;
    format?: string;
  };
  definitions?: Record<string, string>;
  known_files?: string[];
  open_loops?: Array<{
    type: 'question' | 'action' | 'follow_up';
    content: string;
    created_at: string;
  }>;
}

export interface SelectiveRecallSnippet {
  id: string;
  text: string;
  when: string;
  tags?: string[];
  relevance_score?: number;
}

export interface PromptFrameworkConfig {
  // Core configuration
  dialogue_state_budget_tokens: number;
  running_summary_budget_tokens: number;
  recent_turns_budget_tokens: number;
  selective_recall_budget_tokens: number;
  output_max_tokens: number;
  summary_refresh_every_n_turns: number;
  recall_min_score: number;
  recall_k: number;
}

export class PromptEngine {
  private dialogueState: DialogueState;
  private runningSummary: string[];
  private selectiveRecallSnippets: SelectiveRecallSnippet[];
  private recentTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  private config: PromptFrameworkConfig;
  private turnCount: number;

  constructor(initialConfig?: Partial<PromptFrameworkConfig>) {
    this.dialogueState = {};
    this.runningSummary = [];
    this.selectiveRecallSnippets = [];
    this.recentTurns = [];
    this.turnCount = 0;
    
    this.config = {
      dialogue_state_budget_tokens: 400,
      running_summary_budget_tokens: 600,
      recent_turns_budget_tokens: 600,
      selective_recall_budget_tokens: 1200,
      output_max_tokens: 256,
      summary_refresh_every_n_turns: 6,
      recall_min_score: 0.35,
      recall_k: 4,
      ...initialConfig
    };
  }

  // Update dialogue state based on new information
  public updateDialogueState(updates: Partial<DialogueState>): void {
    this.dialogueState = {
      ...this.dialogueState,
      ...updates,
      // Merge arrays instead of replacing them
      ...(updates.constraints && { constraints: [
        ...(this.dialogueState.constraints || []),
        ...updates.constraints
      ].filter((v, i, a) => a.indexOf(v) === i) }), // Remove duplicates
      ...(updates.known_files && { known_files: [
        ...(this.dialogueState.known_files || []),
        ...updates.known_files
      ].filter((v, i, a) => a.indexOf(v) === i) })
    };
  }

  // Add a new turn to the conversation
  public addTurn(role: 'user' | 'assistant', content: string): void {
    this.recentTurns.push({ role, content });
    this.turnCount++;
    
    // Keep only the most recent turns within budget
    this.trimToBudget();
    
    // Check if we should update the running summary
    if (this.turnCount % this.config.summary_refresh_every_n_turns === 0) {
      this.updateRunningSummary();
    }
  }

  // Update the running summary of the conversation
  private updateRunningSummary(): void {
    // In a real implementation, this would use an LLM to generate a summary
    // For now, we'll just take the first 100 chars of each message
    const summaryPoints = this.recentTurns
      .map(turn => {
        const prefix = turn.role === 'user' ? 'User: ' : 'Assistant: ';
        return prefix + turn.content.slice(0, 100) + (turn.content.length > 100 ? '...' : '');
      })
      .slice(-5); // Keep last 5 turns in summary
    
    this.runningSummary = summaryPoints;
  }

  // Add snippets from the knowledge base
  public addSelectiveSnippets(snippets: SelectiveRecallSnippet[]): void {
    // Filter by relevance score and sort by score
    const relevantSnippets = snippets
      .filter(s => (s.relevance_score || 0) >= this.config.recall_min_score)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, this.config.recall_k);
    
    this.selectiveRecallSnippets = relevantSnippets;
  }

  // Trim all components to fit within their token budgets
  private trimToBudget(): void {
    // Simple character-based trimming (in a real app, use a proper tokenizer)
    const charPerToken = 4; // Rough estimate
    
    // Trim recent turns
    let totalChars = 0;
    const maxRecentChars = this.config.recent_turns_budget_tokens * charPerToken;
    this.recentTurns = this.recentTurns.reduceRight<Array<{role: 'user' | 'assistant', content: string}>>((acc, turn) => {
      const turnChars = turn.content.length + 10; // +10 for role prefix
      if (totalChars + turnChars <= maxRecentChars) {
        totalChars += turnChars;
        return [turn, ...acc];
      }
      return acc;
    }, []);
    
    // Trim running summary
    const maxSummaryChars = this.config.running_summary_budget_tokens * charPerToken;
    let summaryChars = 0;
    this.runningSummary = this.runningSummary.filter(point => {
      if (summaryChars + point.length <= maxSummaryChars) {
        summaryChars += point.length;
        return true;
      }
      return false;
    });
  }

  // Generate the final prompt for the LLM
  public generatePrompt(userMessage: string, depthMode: DepthMode = 'Standard'): string {
    // Update dialogue state with current model configuration
    this.updateDialogueState({
      preferences: {
        ...this.dialogueState.preferences,
        style: depthMode === 'Quick' ? 'concise' : 
               depthMode === 'DeepDive' ? 'detailed' : 'balanced'
      }
    });

    // Format the prompt according to the framework
    const promptParts: string[] = [];
    
    // 1. System prompt
    promptParts.push(`You are a precise, helpful AI assistant. You must reason using ONLY the context blocks provided below.`);
    
    // 2. Dialogue State
    promptParts.push('\n[DIALOGUE STATE]');
    promptParts.push(JSON.stringify(this.dialogueState, null, 2));
    
    // 3. Running Summary
    if (this.runningSummary.length > 0) {
      promptParts.push('\n[RUNNING SUMMARY]');
      promptParts.push(this.runningSummary.join('\n'));
    }
    
    // 4. Selective Recall Snippets
    if (this.selectiveRecallSnippets.length > 0) {
      promptParts.push('\n[SELECTIVE RECALL SNIPPETS]');
      this.selectiveRecallSnippets.forEach((snippet, index) => {
        promptParts.push(`[S${index + 1}] ${snippet.text}`);
      });
    }
    
    // 5. Recent Turns
    if (this.recentTurns.length > 0) {
      promptParts.push('\n[RECENT TURNS]');
      this.recentTurns.forEach((turn, index) => {
        const prefix = turn.role === 'user' ? 'User' : 'Assistant';
        promptParts.push(`${prefix}: ${turn.content}`);
      });
    }
    
    // 6. Current User Message
    promptParts.push('\n[USER MESSAGE]');
    promptParts.push(userMessage);
    
    // 7. Instructions
    promptParts.push('\n[INSTRUCTIONS]');
    promptParts.push('- Be concise by default (≤120 words) unless the user requests more.');
    promptParts.push('- When you use a snippet, cite its ID like [S3] or [T14] inline.');
    promptParts.push('- End your response with: ### END');
    
    return promptParts.join('\n');
  }
  
  // Get the current dialogue state (for debugging or persistence)
  public getDialogueState(): DialogueState {
    return JSON.parse(JSON.stringify(this.dialogueState));
  }
  
  // Load dialogue state (e.g., from a saved session)
  public loadDialogueState(state: DialogueState): void {
    this.dialogueState = JSON.parse(JSON.stringify(state));
  }
}

// Helper function to create a default prompt engine with recommended settings
export function createDefaultPromptEngine(): PromptEngine {
  return new PromptEngine({
    dialogue_state_budget_tokens: 400,
    running_summary_budget_tokens: 600,
    recent_turns_budget_tokens: 600,
    selective_recall_budget_tokens: 1200,
    output_max_tokens: 256,
    summary_refresh_every_n_turns: 5,
    recall_min_score: 0.35,
    recall_k: 4
  });
}
