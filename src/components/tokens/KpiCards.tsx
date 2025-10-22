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
  models?: Array<{
    model: string;
    input: number;
    output: number;
    reasoning: number;
    cost_usd: number;
    requests: number;
  }>;
  isLoading?: boolean;
  showMyUsage?: boolean;
}

export function KpiCards({ summary, models = [], isLoading, showMyUsage = false }: KpiCardsProps) {
  // Calculate model-specific totals for display
  const getModelDisplayName = (model: string) => {
    if (model.includes('sonnet')) return 'Sonnet';
    if (model.includes('haiku')) return 'Haiku';
    if (model.includes('opus')) return 'Opus';
    return model.split('-').slice(0, 2).join('-');
  };

  const modelChips = models.slice(0, 3).map(m => ({
    label: getModelDisplayName(m.model),
    value: (m.input + m.output + m.reasoning).toLocaleString()
  }));

  const costTitle = showMyUsage ? 'Your Total Cost' : 'Total Cost';
  const tokensTitle = showMyUsage ? 'Your Total Tokens' : 'Total Tokens';
  const usersTitle = showMyUsage ? 'Your Requests' : 'Active Users';
  const modelsTitle = showMyUsage ? 'Models You Used' : 'Models Used';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      <KpiCard
        title={costTitle}
        value={summary ? `$${summary.total_cost_usd.toFixed(2)}` : '$0.00'}
        chips={
          models.slice(0, 2).map(m => ({
            label: getModelDisplayName(m.model),
            value: `$${m.cost_usd.toFixed(2)}`
          }))
        }
        isLoading={isLoading}
      />
      <KpiCard
        title={tokensTitle}
        value={summary ? summary.total_tokens.toLocaleString() : '0'}
        chips={modelChips}
        isLoading={isLoading}
      />
      <KpiCard
        title={usersTitle}
        value={showMyUsage ? (models.reduce((sum, m) => sum + m.requests, 0)) : (summary?.active_users ?? 0)}
        chips={
          summary
            ? [
                { label: showMyUsage ? 'Total' : 'Requests', value: models.reduce((sum, m) => sum + m.requests, 0).toLocaleString() },
              ]
            : []
        }
        isLoading={isLoading}
      />
      <KpiCard
        title={modelsTitle}
        value={models.length}
        chips={
          summary
            ? [
                { label: 'Input', value: summary.total_input.toLocaleString() },
                { label: 'Output', value: summary.total_output.toLocaleString() },
              ]
            : []
        }
        isLoading={isLoading}
      />
    </div>
  );
}
