import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QueryParams {
  from: string;
  to: string;
  model?: string;
  user?: string;
  limit?: string;
  cursor?: string;
  interval?: 'hour' | 'day';
  metric?: 'tokens' | 'cost';
}

export async function registerTokenRoutes(app: FastifyInstance) {
  // Summary endpoint
  app.get('/api/tokens/summary', async (req: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const { from, to, model, user } = req.query;

      let query = supabase
        .from('usage_events')
        .select('*')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .eq('status', 'ok');

      if (model && model !== 'all') query = query.eq('model', model);
      if (user) query = query.eq('user_id', user);

      const { data, error } = await query;

      if (error) throw error;

      const total_input = data?.reduce((sum, e) => sum + (e.input_tokens || 0), 0) || 0;
      const total_output = data?.reduce((sum, e) => sum + (e.output_tokens || 0), 0) || 0;
      const total_reasoning = data?.reduce((sum, e) => sum + (e.reasoning_tokens || 0), 0) || 0;

      const summary = {
        total_input,
        total_output,
        total_reasoning,
        total_tokens: total_input + total_output + total_reasoning,
        total_cost_usd: data?.reduce((sum, e) => sum + Number(e.cost_usd || 0), 0) || 0,
        active_users: new Set(data?.map(e => e.user_id)).size,
        avg_latency_ms: data?.length ? Math.round(data.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / data.length) : 0,
        request_count: data?.length || 0,
      };

      return reply.send(summary);
    } catch (error) {
      console.error('Summary error:', error);
      return reply.code(500).send({ error: 'Failed to fetch summary' });
    }
  });

  // Timeseries endpoint
  app.get('/api/tokens/timeseries', async (req: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const { from, to, model, user, interval = 'day' } = req.query;

      let query = supabase
        .from('usage_events')
        .select('*')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .eq('status', 'ok')
        .order('timestamp', { ascending: true });

      if (model && model !== 'all') query = query.eq('model', model);
      if (user) query = query.eq('user_id', user);

      const { data, error } = await query;

      if (error) throw error;

      // Group by interval
      const grouped = new Map<string, any>();

      data?.forEach(event => {
        const date = new Date(event.timestamp);
        let key: string;

        if (interval === 'hour') {
          date.setMinutes(0, 0, 0);
          key = date.toISOString();
        } else {
          key = date.toISOString().split('T')[0];
        }

        if (!grouped.has(key)) {
          grouped.set(key, {
            t: key,
            input: 0,
            output: 0,
            reasoning: 0,
            cost_usd: 0,
            requests: 0,
          });
        }

        const point = grouped.get(key);
        point.input += event.input_tokens || 0;
        point.output += event.output_tokens || 0;
        point.reasoning += event.reasoning_tokens || 0;
        point.cost_usd += Number(event.cost_usd || 0);
        point.requests += 1;
      });

      const points = Array.from(grouped.values()).sort((a, b) => 
        new Date(a.t).getTime() - new Date(b.t).getTime()
      );

      return reply.send({ points });
    } catch (error) {
      console.error('Timeseries error:', error);
      return reply.code(500).send({ error: 'Failed to fetch timeseries' });
    }
  });

  // By user endpoint
  app.get('/api/tokens/by-user', async (req: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const { from, to, model, limit = '50' } = req.query;

      let query = supabase
        .from('usage_events')
        .select('*')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .eq('status', 'ok');

      if (model && model !== 'all') query = query.eq('model', model);

      const { data, error } = await query;

      if (error) throw error;

      // Group by user
      const userMap = new Map<string, any>();

      data?.forEach(event => {
        if (!userMap.has(event.user_id)) {
          userMap.set(event.user_id, {
            user_id: event.user_id,
            user_display: event.user_display,
            input: 0,
            output: 0,
            reasoning: 0,
            cost_usd: 0,
            requests: 0,
          });
        }

        const user = userMap.get(event.user_id);
        user.input += event.input_tokens || 0;
        user.output += event.output_tokens || 0;
        user.reasoning += event.reasoning_tokens || 0;
        user.cost_usd += Number(event.cost_usd || 0);
        user.requests += 1;
      });

      const rows = Array.from(userMap.values())
        .sort((a, b) => (b.input + b.output + b.reasoning) - (a.input + a.output + a.reasoning))
        .slice(0, parseInt(limit));

      return reply.send({ rows });
    } catch (error) {
      console.error('By user error:', error);
      return reply.code(500).send({ error: 'Failed to fetch user data' });
    }
  });

  // By model endpoint
  app.get('/api/tokens/by-model', async (req: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const { from, to, user } = req.query;

      let query = supabase
        .from('usage_events')
        .select('*')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .eq('status', 'ok');

      if (user) query = query.eq('user_id', user);

      const { data, error } = await query;

      if (error) throw error;

      // Group by model
      const modelMap = new Map<string, any>();

      data?.forEach(event => {
        if (!modelMap.has(event.model)) {
          modelMap.set(event.model, {
            model: event.model,
            input: 0,
            output: 0,
            reasoning: 0,
            cost_usd: 0,
            requests: 0,
          });
        }

        const modelData = modelMap.get(event.model);
        modelData.input += event.input_tokens || 0;
        modelData.output += event.output_tokens || 0;
        modelData.reasoning += event.reasoning_tokens || 0;
        modelData.cost_usd += Number(event.cost_usd || 0);
        modelData.requests += 1;
      });

      const rows = Array.from(modelMap.values())
        .sort((a, b) => b.cost_usd - a.cost_usd);

      return reply.send({ rows });
    } catch (error) {
      console.error('By model error:', error);
      return reply.code(500).send({ error: 'Failed to fetch model data' });
    }
  });

  // Leaderboard endpoint
  app.get('/api/tokens/leaderboard', async (req: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const { from, to, model, metric = 'tokens' } = req.query;

      let query = supabase
        .from('usage_events')
        .select('*')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .eq('status', 'ok');

      if (model && model !== 'all') query = query.eq('model', model);

      const { data, error } = await query;

      if (error) throw error;

      // Group by user
      const userMap = new Map<string, any>();

      data?.forEach(event => {
        if (!userMap.has(event.user_id)) {
          userMap.set(event.user_id, {
            user_id: event.user_id,
            user_display: event.user_display,
            tokens: 0,
            cost_usd: 0,
            requests: 0,
          });
        }

        const user = userMap.get(event.user_id);
        user.tokens += (event.input_tokens || 0) + (event.output_tokens || 0) + (event.reasoning_tokens || 0);
        user.cost_usd += Number(event.cost_usd || 0);
        user.requests += 1;
      });

      const rows = Array.from(userMap.values())
        .sort((a, b) => {
          if (metric === 'cost') return b.cost_usd - a.cost_usd;
          return b.tokens - a.tokens;
        })
        .slice(0, 20)
        .map((row, index) => ({ ...row, rank: index + 1 }));

      return reply.send({ rows });
    } catch (error) {
      console.error('Leaderboard error:', error);
      return reply.code(500).send({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Export CSV endpoint
  app.get('/api/tokens/export.csv', async (req: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const { from, to, model, user } = req.query;

      let query = supabase
        .from('usage_events')
        .select('*')
        .gte('timestamp', from)
        .lte('timestamp', to)
        .order('timestamp', { ascending: false });

      if (model && model !== 'all') query = query.eq('model', model);
      if (user) query = query.eq('user_id', user);

      const { data, error } = await query;

      if (error) throw error;

      // Generate CSV
      const headers = ['timestamp', 'user_display', 'model', 'input_tokens', 'output_tokens', 'reasoning_tokens', 'cost_usd', 'latency_ms', 'status'];
      const csvRows = [headers.join(',')];

      data?.forEach(event => {
        const row = [
          event.timestamp,
          event.user_display,
          event.model,
          event.input_tokens,
          event.output_tokens,
          event.reasoning_tokens || 0,
          event.cost_usd,
          event.latency_ms || 0,
          event.status,
        ];
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="token-usage-${new Date().toISOString().split('T')[0]}.csv"`);
      return reply.send(csv);
    } catch (error) {
      console.error('Export error:', error);
      return reply.code(500).send({ error: 'Failed to export data' });
    }
  });
}
