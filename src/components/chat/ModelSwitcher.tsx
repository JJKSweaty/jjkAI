'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { MODELS } from '@/lib/constants';

interface ModelSwitcherProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSwitcher({ currentModel, onModelChange, disabled }: ModelSwitcherProps) {
  const selectedModel = MODELS.find(m => m.id === currentModel) || MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled} className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
          <span className="hidden sm:inline">{selectedModel.name}</span>
          <span className="sm:hidden">{selectedModel.name.split(' ')[1]}</span>
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 sm:w-64">
        <DropdownMenuLabel className="text-sm">Select Model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className="flex flex-col items-start py-3 sm:py-2"
          >
            <div className="font-medium text-sm">{model.name}</div>
            <div className="text-xs text-muted-foreground line-clamp-1">{model.description}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
