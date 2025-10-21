export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatStreamOptions {
  model: string;
  messages: Message[];
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export interface StreamEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  message?: string;
}
