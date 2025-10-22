import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: string | number;
  sub?: string;
  chips?: { label: string; value: string | number }[];
  isLoading?: boolean;
}

export function KpiCard({ title, value, sub, chips = [], isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <Skeleton className="h-10 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl sm:rounded-2xl">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-2 sm:gap-0 px-4 sm:px-6 pb-4 sm:pb-6">
        <div>
          <div className="text-2xl sm:text-3xl font-semibold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-wrap justify-start sm:justify-end">
          {chips.map((c, idx) => (
            <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs px-2 py-0.5">
              {c.label}: {c.value}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface KpiCardsProps {
  summary?: {
    total_cost_usd: number;
    total_tokens: number;
    total_input: number;
    total_output: number;
    total_reasoning: number;
    active_users: number;
    avg_latency_ms: number;
  };
  isLoading?: boolean;
}

export function KpiCards({ summary, isLoading }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      <KpiCard
        title="Total Cost"
        value={summary ? `$${summary.total_cost_usd.toFixed(2)}` : '$0.00'}
        isLoading={isLoading}
      />
      <KpiCard
        title="Total Tokens"
        value={summary ? summary.total_tokens.toLocaleString() : '0'}
        chips={
          summary
            ? [
                { label: 'In', value: summary.total_input.toLocaleString() },
                { label: 'Out', value: summary.total_output.toLocaleString() },
                ...(summary.total_reasoning > 0
                  ? [{ label: 'Reason', value: summary.total_reasoning.toLocaleString() }]
                  : []),
              ]
            : []
        }
        isLoading={isLoading}
      />
      <KpiCard
        title="Active Users"
        value={summary?.active_users ?? 0}
        isLoading={isLoading}
      />
      <KpiCard
        title="Avg Latency"
        value={summary ? `${Math.round(summary.avg_latency_ms)}ms` : '0ms'}
        isLoading={isLoading}
      />
    </div>
  );
}
