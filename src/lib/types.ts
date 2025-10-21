export interface Message {
  role: 'user' | 'assistant';
  content: string;
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
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error' | 'continuation_prompt';
  text?: string;
  message?: string;
  usage?: UsageMetadata;
  cost?: number;
  continuationCount?: number;
}
