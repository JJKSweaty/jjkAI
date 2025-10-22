'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface FiltersBarProps {
  onDateRangeChange: (from: string, to: string) => void;
  onModelChange: (model: string) => void;
  onExport: () => void;
  onRefresh: () => void;
  models: string[];
}

export function FiltersBar({
  onDateRangeChange,
  onModelChange,
  onExport,
  onRefresh,
  models,
}: FiltersBarProps) {
  const [preset, setPreset] = useState('7d');

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const to = new Date();
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

    onDateRangeChange(from.toISOString(), to.toISOString());
  };

  return (
    <div className="flex flex-wrap items-center gap-4 pb-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[140px]">
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
        <SelectTrigger className="w-[200px]">
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

      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={onExport}>
          Export CSV
        </Button>
      </div>
    </div>
  );
}
