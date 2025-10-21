'use client';
import { Badge } from '@/components/ui/badge';
import { formatTokens, formatCost } from '@/lib/format';
import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UsageBadgeProps {
  tokens?: number;
  cost?: number;
}

export function UsageBadge({ tokens = 0, cost = 0 }: UsageBadgeProps) {
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    // Accumulate tokens and cost
    if (tokens > 0) setTotalTokens(prev => prev + tokens);
    if (cost > 0) setTotalCost(prev => prev + cost);
  }, [tokens, cost]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
            <Activity className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">
                {formatTokens(totalTokens)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium text-primary">
                {formatCost(totalCost)}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Total Tokens: {totalTokens.toLocaleString()}</div>
            <div>Total Cost: {formatCost(totalCost)}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
