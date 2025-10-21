'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { DepthModeSelector, TokenBudgetDisplay } from './DepthModeSelector';
import { DepthMode } from '@/lib/tokenOptimization';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  depthMode?: DepthMode;
  onDepthModeChange?: (mode: DepthMode) => void;
  tokenBudget?: {
    estimatedInput?: number;
    maxOutput?: number;
    used?: number;
  };
}

export function Composer({ 
  onSend, 
  disabled, 
  depthMode = 'Standard', 
  onDepthModeChange,
  tokenBudget 
}: ComposerProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  return (
    <div className="border-t bg-background">
      {/* Depth Mode and Token Budget Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          {onDepthModeChange && (
            <DepthModeSelector 
              value={depthMode} 
              onChange={onDepthModeChange}
              disabled={disabled}
            />
          )}
          {tokenBudget && (
            <TokenBudgetDisplay
              mode={depthMode}
              estimatedInput={tokenBudget.estimatedInput}
              maxOutput={tokenBudget.maxOutput}
              used={tokenBudget.used}
            />
          )}
        </div>
      </div>
      
      {/* Message Input */}
      <div className="flex gap-2 p-4">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Claude..."
          className="flex-1 resize-none min-h-[60px] max-h-[200px]"
          disabled={disabled}
        />
        <Button 
          disabled={disabled || !text.trim()} 
          onClick={handleSend}
          size="icon"
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
