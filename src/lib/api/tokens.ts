// Token analytics API client

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';

export interface PeriodParams {
  from: string;
  to: string;
  model?: string;
  user?: string;
  limit?: number;
  cursor?: string;
}

export interface SummaryData {
  total_tokens: number;
  total_input: number;
  total_output: number;
  total_reasoning: number;
  total_cost_usd: number;
  active_users: number;
  avg_latency_ms: number;
  request_count: number;
}

export interface TimeseriesPoint {
  t: string;
  input: number;
  output: number;
  reasoning: number;
  cost_usd: number;
  requests: number;
}

export interface UserRow {
  user_id: string;
  user_display: string;
  input: number;
  output: number;
  reasoning: number;
  cost_usd: number;
  requests: number;
  rank?: number;
}

export interface ModelRow {
  model: string;
  input: number;
  output: number;
  reasoning: number;
  cost_usd: number;
  requests: number;
}

export interface LeaderboardRow {
  rank: number;
  user_id: string;
  user_display: string;
  tokens: number;
  cost_usd: number;
  requests: number;
}

const periodParams = (p: PeriodParams) => {
  const params = new URLSearchParams();
  params.append('from', p.from);
  params.append('to', p.to);
  if (p.model) params.append('model', p.model);
  if (p.user) params.append('user', p.user);
  if (p.limit) params.append('limit', p.limit.toString());
  if (p.cursor) params.append('cursor', p.cursor);
  return params.toString();
};

export async function getSummary(p: PeriodParams): Promise<SummaryData> {
  const res = await fetch(`${API_BASE}/api/tokens/summary?${periodParams(p)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function getTimeseries(
  p: PeriodParams,
  interval: 'hour' | 'day' = 'day'
): Promise<{ points: TimeseriesPoint[] }> {
  const params = periodParams(p);
  const res = await fetch(`${API_BASE}/api/tokens/timeseries?${params}&interval=${interval}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch timeseries');
  return res.json();
}

export async function getByUser(
  p: PeriodParams
): Promise<{ rows: UserRow[]; nextCursor?: string }> {
  const res = await fetch(`${API_BASE}/api/tokens/by-user?${periodParams(p)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch user data');
  return res.json();
}

export async function getByModel(
  p: PeriodParams
): Promise<{ rows: ModelRow[]; nextCursor?: string }> {
  const res = await fetch(`${API_BASE}/api/tokens/by-model?${periodParams(p)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch model data');
  return res.json();
}

export async function getLeaderboard(
  p: PeriodParams,
  metric: 'tokens' | 'cost' = 'tokens'
): Promise<{ rows: LeaderboardRow[] }> {
  const params = periodParams(p);
  const res = await fetch(`${API_BASE}/api/tokens/leaderboard?${params}&metric=${metric}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function exportCSV(p: PeriodParams): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/tokens/export.csv?${periodParams(p)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to export CSV');
  return res.blob();
}
