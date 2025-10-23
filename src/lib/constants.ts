export const MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Claude 4.5 Haiku', description: 'Fastest model for daily tasks' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude 4.5 Sonnet', description: 'Smart, efficient model for everyday use' },
  { id: 'claude-opus-4-1-20250805', name: 'Claude 4.1 Opus', description: 'Powerful, large model for complex challenges' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', description: 'Balanced performance' },
] as const;

export const DEFAULT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'claude-haiku-4-5-20251001';
