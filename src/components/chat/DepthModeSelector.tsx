import React from 'react';
import { Badge } from '@/components/ui/badge';
import { DepthMode } from '@/lib/tokenOptimization';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Zap, Scale, Search } from 'lucide-react';

interface DepthModeSelectorProps {
  value: DepthMode;
  onChange: (mode: DepthMode) => void;
  disabled?: boolean;
  compact?: boolean;
}

const DEPTH_MODE_CONFIG = {
  Quick: {
    label: 'Quick',
    description: 'Fast, concise',
    fullDescription: 'Fast, concise answers',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    tokens: '~500',
    icon: Zap,
  },
  Standard: {
    label: 'Standard', 
    description: 'Balanced',
    fullDescription: 'Balanced depth & detail',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    tokens: '~900',
    icon: Scale,
  },
  DeepDive: {
    label: 'Deep',
    description: 'Comprehensive',
    fullDescription: 'Comprehensive analysis',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    tokens: '~1200+',
    icon: Search,
  },
} as const;

export function DepthModeSelector({ value, onChange, disabled, compact = false }: DepthModeSelectorProps) {
  const currentConfig = DEPTH_MODE_CONFIG[value];
  const Icon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          disabled={disabled}
          className="h-7 gap-1.5 px-2 text-xs font-normal hover:bg-accent"
        >
          <Icon className={`h-3.5 w-3.5 ${currentConfig.color}`} />
          <span className="text-muted-foreground">{currentConfig.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {Object.entries(DEPTH_MODE_CONFIG).map(([mode, config]) => {
          const ModeIcon = config.icon;
          const isSelected = mode === value;
          return (
            <DropdownMenuItem
              key={mode}
              onClick={() => onChange(mode as DepthMode)}
              className={`flex items-start gap-2 cursor-pointer ${isSelected ? config.bgColor : ''}`}
            >
              <ModeIcon className={`h-4 w-4 mt-0.5 ${config.color}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{config.tokens}</span>
                </div>
                <span className="text-xs text-muted-foreground">{config.fullDescription}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TokenBudgetDisplayProps {
  mode: DepthMode;
  estimatedInput?: number;
  maxOutput?: number;
  used?: number;
}

export function TokenBudgetDisplay({ mode, estimatedInput, maxOutput, used }: TokenBudgetDisplayProps) {
  if (!estimatedInput && !maxOutput && !used) return null;
  
  const percentage = used && maxOutput ? (used / maxOutput) * 100 : 0;
  const isNearLimit = percentage > 80;
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {maxOutput && (
        <Badge 
          variant="outline" 
          className={`h-5 px-1.5 text-xs font-normal ${
            isNearLimit ? 'border-orange-500 text-orange-600 dark:text-orange-400' : ''
          }`}
        >
          {used || 0}/{maxOutput}
        </Badge>
      )}
    </div>
  );
}