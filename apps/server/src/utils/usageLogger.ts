import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UsageEvent {
  user_id: string;
  user_display: string;
  session_id?: string;
  thread_id?: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_tokens?: number;
  tool_tokens?: number;
  latency_ms?: number;
  status: 'ok' | 'error' | 'rate_limited';
  finish_reason?: string;
  depth_mode?: string;
  task_class?: string;
}

// Price map (matches database)
const PRICE_MAP: Record<string, { input: number; output: number; reasoning: number }> = {
  'claude-3-5-sonnet-latest': { input: 0.003, output: 0.015, reasoning: 0 },
  'claude-3-5-haiku-latest': { input: 0.001, output: 0.005, reasoning: 0 },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075, reasoning: 0 },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015, reasoning: 0 },
  'claude-opus-4-1-20250805': { input: 0.015, output: 0.075, reasoning: 0 },
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015, reasoning: 0 },
  'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004, reasoning: 0 },
};

function computeCost(model: string, usage: { input: number; output: number; reasoning?: number }): number {
  const pricing = PRICE_MAP[model] || PRICE_MAP['claude-3-5-haiku-latest'];
  
  const inputCost = (usage.input / 1000) * pricing.input;
  const outputCost = (usage.output / 1000) * pricing.output;
  const reasoningCost = ((usage.reasoning || 0) / 1000) * pricing.reasoning;
  
  return inputCost + outputCost + reasoningCost;
}

export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    const cost_usd = computeCost(event.model, {
      input: event.input_tokens,
      output: event.output_tokens,
      reasoning: event.reasoning_tokens,
    });

    const { error } = await supabase.from('usage_events').insert({
      timestamp: new Date().toISOString(),
      user_id: event.user_id,
      user_display: event.user_display,
      session_id: event.session_id,
      thread_id: event.thread_id,
      model: event.model,
      input_tokens: event.input_tokens,
      output_tokens: event.output_tokens,
      reasoning_tokens: event.reasoning_tokens || 0,
      tool_tokens: event.tool_tokens || 0,
      latency_ms: event.latency_ms,
      status: event.status,
      finish_reason: event.finish_reason,
      depth_mode: event.depth_mode,
      task_class: event.task_class,
      cost_usd,
    });

    if (error) {
      console.error('Failed to log usage:', error);
    }
  } catch (error) {
    console.error('Usage logging error:', error);
  }
}

export { computeCost, PRICE_MAP };
