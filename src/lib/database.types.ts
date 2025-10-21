export interface Thread {
  id: string;
  user_id: string;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Usage {
  id: string;
  user_id: string;
  thread_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  created_at: string;
}
