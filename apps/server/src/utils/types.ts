export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: Message[];
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  message?: string;
}
