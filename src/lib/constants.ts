export const MODELS = [
  // Claude 4.5 & 4.1 models (latest)
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', description: 'Fastest model for daily tasks' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Smart, efficient model for everyday use' },
  { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', description: 'Powerful, large model for complex challenges' },
  
  // Claude 4 models
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced performance' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'High capability' },
  
  // Claude 3.7 & 3.5 models
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Enhanced performance' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient' },
  
  // Claude 3 models
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fast responses' },
] as const;

export const DEFAULT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'claude-3-5-haiku-20241022';
