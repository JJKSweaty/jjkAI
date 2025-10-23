export interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: {
    content: string;
    isStreaming?: boolean;
    duration?: number;
  };
}

export interface UsageMetadata {
  inputTokens: number;
  outputTokens: number;
}

export interface ChatStreamOptions {
  model: string;
  messages: Message[];
  mode?: 'auto' | 'manual';
  onToken: (text: string) => void;
  onDone: (usage?: UsageMetadata) => void;
  onError: (error: string) => void;
  onReasoning?: (content: string, isStreaming: boolean, duration?: number) => void;
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error' | 'continuation_prompt' | 'reasoning_start' | 'reasoning_delta' | 'reasoning_end';
  text?: string;
  message?: string;
  usage?: UsageMetadata;
  cost?: number;
  continuationCount?: number;
  reasoning?: {
    content?: string;
    duration?: number;
  };
}
