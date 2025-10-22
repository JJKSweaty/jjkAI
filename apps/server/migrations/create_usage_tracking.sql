-- Token usage tracking tables

-- Price map for cost calculation
CREATE TABLE IF NOT EXISTS price_map (
  model TEXT PRIMARY KEY,
  input_per_1k NUMERIC(10, 5) NOT NULL,
  output_per_1k NUMERIC(10, 5) NOT NULL,
  reasoning_per_1k NUMERIC(10, 5) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert current Claude pricing (per 1K tokens in USD)
INSERT INTO price_map (model, input_per_1k, output_per_1k, reasoning_per_1k) VALUES
  ('claude-3-5-sonnet-latest', 0.003, 0.015, 0),
  ('claude-3-5-haiku-latest', 0.001, 0.005, 0),
  ('claude-opus-4-20250514', 0.015, 0.075, 0)
ON CONFLICT (model) DO UPDATE SET
  input_per_1k = EXCLUDED.input_per_1k,
  output_per_1k = EXCLUDED.output_per_1k,
  reasoning_per_1k = EXCLUDED.reasoning_per_1k,
  updated_at = NOW();

-- Usage events table
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  user_display TEXT NOT NULL,
  session_id TEXT,
  thread_id TEXT,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  reasoning_tokens INTEGER DEFAULT 0,
  tool_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ok', -- ok|error|rate_limited
  cost_usd NUMERIC(10, 5) NOT NULL DEFAULT 0,
  finish_reason TEXT,
  depth_mode TEXT,
  task_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_time ON usage_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user_time ON usage_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_model_time ON usage_events(model, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_status ON usage_events(status);
CREATE INDEX IF NOT EXISTS idx_usage_thread ON usage_events(thread_id);

-- Materialized view for daily aggregates (performance optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_usage_summary AS
SELECT 
  DATE_TRUNC('day', timestamp) as day,
  user_id,
  model,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(reasoning_tokens) as total_reasoning_tokens,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency_ms,
  COUNT(DISTINCT session_id) as unique_sessions
FROM usage_events
WHERE status = 'ok'
GROUP BY day, user_id, model;

CREATE INDEX IF NOT EXISTS idx_daily_summary_day ON daily_usage_summary(day DESC);
CREATE INDEX IF NOT EXISTS idx_daily_summary_user ON daily_usage_summary(user_id, day DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_daily_usage_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_usage_summary;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE usage_events IS 'Granular token usage tracking for all AI model requests';
COMMENT ON TABLE price_map IS 'Current pricing per 1K tokens for cost calculation';
COMMENT ON COLUMN usage_events.user_display IS 'Safe display name (may be anonymized for non-admins)';
COMMENT ON COLUMN usage_events.cost_usd IS 'Computed server-side from price_map - never trust client';
