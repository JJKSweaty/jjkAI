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
  // Don't accumulate - just display the values passed from useChat
  // The useChat hook already loads cumulative totals from the database
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
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
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Lifetime Tokens: {tokens.toLocaleString()}</div>
            <div>Lifetime Cost: {formatCost(cost)}</div>
            <div className="text-muted-foreground mt-2 pt-2 border-t">
              All-time usage across all conversations
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
