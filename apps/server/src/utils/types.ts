export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: Message[];
  mode?: 'auto' | 'manual';
  threadId?: string;
  depthMode?: 'Quick' | 'Standard' | 'DeepDive';
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  message?: string;
}
