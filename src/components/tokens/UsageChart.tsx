import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface ChartDataPoint {
  t: string;
  input: number;
  output: number;
  reasoning: number;
  cost_usd: number;
  requests: number;
}

interface UsageChartProps {
  data?: ChartDataPoint[];
  isLoading?: boolean;
}

type MetricType = 'tokens' | 'cost' | 'requests';

export function UsageChart({ data = [], isLoading }: UsageChartProps) {
  const [metric, setMetric] = useState<MetricType>('tokens');

  const chartData = data.map((point) => ({
    ...point,
    tokens: point.input + point.output + (point.reasoning || 0),
    date: new Date(point.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Usage Over Time</CardTitle>
        <Tabs value={metric} onValueChange={(v: string) => setMetric(v as MetricType)}>
          <TabsList>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                tickFormatter={(value: number) => {
                  if (metric === 'cost') return `$${value.toFixed(2)}`;
                  return value.toLocaleString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => {
                  if (metric === 'cost') return [`$${value.toFixed(4)}`, 'Cost'];
                  return [value.toLocaleString(), metric === 'tokens' ? 'Tokens' : 'Requests'];
                }}
              />
              <Area
                type="monotone"
                dataKey={metric === 'cost' ? 'cost_usd' : metric}
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorMetric)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
