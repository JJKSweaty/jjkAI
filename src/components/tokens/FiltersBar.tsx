'use client';

import { Button } from '@/components/ui/button';
import { Calendar, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

interface FiltersBarProps {
  onDateRangeChange: (from: string, to: string) => void;
  onModelChange: (model: string) => void;
  onUserToggle?: (showMyUsage: boolean) => void;
  onExport: () => void;
  onRefresh: () => void;
  models: string[];
  showMyUsage?: boolean;
}

export function FiltersBar({
  onDateRangeChange,
  onModelChange,
  onUserToggle,
  onExport,
  onRefresh,
  models,
  showMyUsage = false,
}: FiltersBarProps) {
  const [preset, setPreset] = useState('7d');

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    let from = new Date();

    switch (value) {
      case '7d':
        from.setDate(to.getDate() - 7);
        break;
      case '30d':
        from.setDate(to.getDate() - 30);
        break;
      case '90d':
        from.setDate(to.getDate() - 90);
        break;
      default:
        from.setDate(to.getDate() - 7);
    }

    from.setHours(0, 0, 0, 0);
    onDateRangeChange(from.toISOString(), to.toISOString());
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-4 pb-4 sm:pb-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-9">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select onValueChange={onModelChange}>
        <SelectTrigger className="w-full sm:w-[200px] h-10 sm:h-9">
          <SelectValue placeholder="All models" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All models</SelectItem>
          {models.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onUserToggle && (
        <Button
          variant={showMyUsage ? 'default' : 'outline'}
          size="sm"
          onClick={() => onUserToggle(!showMyUsage)}
          className="h-10 sm:h-9 gap-2"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{showMyUsage ? 'My Usage' : 'All Users'}</span>
          <span className="sm:hidden">{showMyUsage ? 'Mine' : 'All'}</span>
          {showMyUsage && <Badge variant="secondary" className="ml-1 text-xs">Active</Badge>}
        </Button>
      )}

      <div className="sm:ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} className="flex-1 sm:flex-none h-10 sm:h-9">
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={onExport} className="flex-1 sm:flex-none h-10 sm:h-9">
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>
    </div>
  );
}
