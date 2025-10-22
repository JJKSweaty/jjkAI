'use client';
import { Badge } from '@/components/ui/badge';
import { formatTokens, formatCost } from '@/lib/format';
import { useState, useEffect } from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  
  const handleClick = () => {
    router.push('/analytics/tokens');
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            onClick={handleClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
          >
            <Activity className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-foreground">
                {formatTokens(tokens)}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium text-primary">
                {formatCost(cost)}
              </span>
            </div>
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-3 w-3" />
              Click to view analytics
            </div>
            <div className="pt-2 border-t mt-2">
              <div>Lifetime Tokens: {tokens.toLocaleString()}</div>
              <div>Lifetime Cost: {formatCost(cost)}</div>
            </div>
            <div className="text-muted-foreground mt-2 pt-2 border-t">
              All-time usage across all conversations
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
