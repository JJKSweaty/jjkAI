'use client';
import { Badge } from '@/components/ui/badge';
import { formatTokens, formatCost } from '@/lib/format';

interface UsageBadgeProps {
  tokens?: number;
  cost?: number;
}

export function UsageBadge({ tokens = 0, cost = 0 }: UsageBadgeProps) {
  if (tokens === 0 && cost === 0) return null;

  return (
    <div className="flex gap-2">
      {tokens > 0 && (
        <Badge variant="secondary">
          {formatTokens(tokens)} tokens
        </Badge>
      )}
      {cost > 0 && (
        <Badge variant="outline">
          {formatCost(cost)}
        </Badge>
      )}
    </div>
  );
}
